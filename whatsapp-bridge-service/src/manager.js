const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const crypto = require('crypto');
const P = require('pino');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  jidNormalizedUser,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { encrypt, decrypt } = require('./crypto');
const { config } = require('./config');

// Runtime-only temp directories per clinic; long-term state persisted locally.
const sessionTempDirs = new Map();
const LOCAL_SESSIONS_ROOT = config.sessionsDir
  ? path.resolve(__dirname, '..', config.sessionsDir)
  : path.join(__dirname, '..', 'db', 'sessions');
// Default to warn to reduce Baileys verbose session logs (can override via LOG_LEVEL).
const logger = P({ level: config.logLevel });
const activeSessions = new Map();
const reconnectFailures = new Map(); // consecutive close events per clinic
const msgRetryCache = new Map(); // shared Baileys retry cache across reconnects
const sendQueues = new Map(); // per-clinic outbound throttling
let sessionDirMapCache = null;

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const removeDir = async (dir) => {
  await fs.promises.rm(dir, { recursive: true, force: true });
};

const ensureLocalStoreDir = async () => {
  await fs.promises.mkdir(LOCAL_SESSIONS_ROOT, { recursive: true });
};

const getOrCreateSessionDir = async (clinicId) => {
  const key = String(clinicId);
  if (sessionTempDirs.has(key)) {
    return sessionTempDirs.get(key);
  }
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), `wa-${key}-`));
  sessionTempDirs.set(key, tmp);
  return tmp;
};

const getKnownSessionDir = async (clinicId) => {
  const key = String(clinicId);
  if (sessionTempDirs.has(key)) {
    return sessionTempDirs.get(key);
  }
  return getOrCreateSessionDir(key);
};

const localSessionPath = (clinicId) => path.join(LOCAL_SESSIONS_ROOT, `${clinicId}.json`);

const deleteLocalSessionRecord = async (clinicId) => {
  await ensureLocalStoreDir();
  const file = localSessionPath(clinicId);
  if (fs.existsSync(file)) {
    await fs.promises.rm(file, { force: true });
  }
};

const getSessionRecord = async (clinicId) => {
  await ensureLocalStoreDir();
  const file = localSessionPath(clinicId);
  if (!fs.existsSync(file)) return null;
  const raw = await fs.promises.readFile(file, 'utf8');
  return JSON.parse(raw);
};

const upsertSessionRecord = async (clinicId, patch = {}) => {
  const base = {
    clinic_id: clinicId,
    provider: patch.provider || 'wa_web',
    status: patch.status || 'disconnected',
    auth_state_encrypted: patch.authStateEncrypted ?? null,
    qr_code: patch.qrCode ?? null,
    device_jid: patch.deviceJid ?? null,
    last_connected_at: patch.lastConnectedAt ?? null,
    last_error: patch.lastError ?? null,
    updated_at: new Date().toISOString()
  };

  await ensureLocalStoreDir();
  const file = localSessionPath(clinicId);
  const existing = fs.existsSync(file) ? JSON.parse(await fs.promises.readFile(file, 'utf8')) : {};
  const merged = { ...existing, ...base };
  await fs.promises.writeFile(file, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
};

const listPersistedSessionIds = async () => {
  await ensureLocalStoreDir();
  const files = await fs.promises.readdir(LOCAL_SESSIONS_ROOT);
  const candidates = files.filter((f) => f.endsWith('.json'));
  const result = [];
  for (const file of candidates) {
    try {
      const full = path.join(LOCAL_SESSIONS_ROOT, file);
      const parsed = JSON.parse(await fs.promises.readFile(full, 'utf8'));
      if (parsed?.auth_state_encrypted) {
        result.push(path.basename(file, '.json'));
      }
    } catch (_err) {
      // Skip unreadable files but continue processing others.
    }
  }
  return result;
};

const serializeDirectory = async (dir) => {
  const output = {};
  if (!fs.existsSync(dir)) {
    return output;
  }

  const visit = async (baseDir) => {
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      const relPath = path.relative(dir, fullPath).replace(/\\/g, '/');
      output[relPath] = (await fs.promises.readFile(fullPath)).toString('base64');
    }
  };

  await visit(dir);
  return output;
};

const restoreDirectory = async (dir, files = {}) => {
  await removeDir(dir);
  await ensureDir(dir);

  for (const [relPath, base64] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    await ensureDir(path.dirname(fullPath));
    await fs.promises.writeFile(fullPath, Buffer.from(base64, 'base64'));
  }
};

const notifyBackend = async (payload) => {
  const backendUrl = config.backendUrl;

  const body = payload || {};
  const timestamp = Date.now();
  const headers = {
    'x-bridge-timestamp': timestamp
  };

  if (config.backendSharedSecret) {
    const secret = config.backendSharedSecret;
    const serialized = JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${timestamp}.${serialized}`);
    headers['x-bridge-signature'] = hmac.digest('hex');
  }

  await axios.post(
    `${backendUrl.replace(/\/$/, '')}/api/whatsapp/bridge/events`,
    body,
    {
      timeout: 10000,
      headers
    }
  );
};

const extractMessageText = (message) => {
  if (!message?.message) {
    return { text: '', metadata: {} };
  }

  const content = message.message;
  const conversation = content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || content.documentMessage?.caption
    || '';

  const imageMessage = content.imageMessage;
  const videoMessage = content.videoMessage;
  const audioMessage = content.audioMessage;
  const documentMessage = content.documentMessage;
  const media = imageMessage || videoMessage || audioMessage || documentMessage;

  return {
    text: conversation,
    metadata: media
      ? {
        mediaType: imageMessage
          ? 'image'
          : videoMessage
            ? 'video'
            : audioMessage
              ? 'audio'
              : 'document',
        mimeType: media.mimetype || null,
        fileName: documentMessage?.fileName || null
      }
      : {}
  };
};

const inferMediaMessage = (mediaUrl, body) => {
  const normalized = String(mediaUrl || '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(normalized)) {
    return { image: { url: mediaUrl }, ...(body ? { caption: body } : {}) };
  }
  if (/\.(mp4|mov|avi|mkv)(\?|$)/.test(normalized)) {
    return { video: { url: mediaUrl }, ...(body ? { caption: body } : {}) };
  }
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/.test(normalized)) {
    return { audio: { url: mediaUrl }, mimetype: 'audio/mpeg' };
  }
  return { document: { url: mediaUrl }, ...(body ? { caption: body } : {}) };
};

const jidForPhone = (phone) => {
  const normalized = String(phone || '').replace(/\D/g, '');
  if (!normalized) {
    throw new Error('A valid phone number is required');
  }
  return `${normalized}@s.whatsapp.net`;
};

const resolveJid = ({ to, toJid, toPn }) => {
  const candidate = toJid || to || toPn || '';
  if (!candidate) {
    throw new Error('to or toJid is required');
  }
  // If it already looks like a JID, use it directly.
  if (candidate.includes('@')) {
    return candidate;
  }
  return jidForPhone(candidate);
};

const persistAuthState = async (clinicId, dir) => {
  const archive = await serializeDirectory(dir);
  const encrypted = encrypt(JSON.stringify(archive));
  await upsertSessionRecord(clinicId, {
    provider: 'wa_web',
    authStateEncrypted: encrypted
  });
};

const restoreAuthState = async (clinicId, dir) => {
  const record = await getSessionRecord(clinicId);
  const encrypted = record?.auth_state_encrypted || null;

  if (!encrypted) {
    await removeDir(dir);
    await ensureDir(dir);
    return;
  }

  const decrypted = decrypt(encrypted);
  const files = decrypted ? JSON.parse(decrypted) : {};
  await restoreDirectory(dir, files);
};

const attachSocketHandlers = async (clinicId, socket, authDir, saveCreds) => {
  socket.ev.on('creds.update', async () => {
    await saveCreds();
    await persistAuthState(clinicId, authDir);
  });

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info({ clinicId }, 'QR generated for WhatsApp session; awaiting scan');
      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: 'connecting',
        qrCode: qr,
        lastError: null
      });
    }

    if (connection === 'open') {
      reconnectFailures.delete(String(clinicId));
      await persistAuthState(clinicId, authDir);
      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: 'connected',
        qrCode: null,
        deviceJid: socket.user?.id || null,
        lastConnectedAt: new Date().toISOString(),
        lastError: null
      });
      logger.info({ clinicId, deviceJid: socket.user?.id || null }, 'WhatsApp session connected');
    }

    if (connection === 'close') {
      const failureCount = (reconnectFailures.get(String(clinicId)) || 0) + 1;
      reconnectFailures.set(String(clinicId), failureCount);

      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.statusCode ||
        lastDisconnect?.error?.data?.statusCode ||
        null;
      const message = lastDisconnect?.error?.message || 'WhatsApp Web session disconnected';
      const isQrTimeout =
        statusCode === DisconnectReason.timedOut ||
        /qr refs attempts ended/i.test(message || '');
      const isStreamRestart =
        statusCode === 515 ||
        /restart required/i.test(message || '') ||
        /stream errored/i.test(message || '');
      const isConnectionTerminated =
        statusCode === DisconnectReason.connectionClosed ||
        /connection terminated/i.test(message || '');
      const isKeepAliveTimeout = /Timed Out/i.test(message || '');
      const isIntentionalLogout = /Intentional Logout/i.test(message || '');
      const isDeviceRemoved =
        statusCode === 401 ||
        statusCode === DisconnectReason.loggedOut ||
        /device_removed|logged\s*out|conflict/i.test(message || '');
      const shouldReconnect =
        !isIntentionalLogout && (
          isQrTimeout ||
          isStreamRestart ||
          isConnectionTerminated ||
          (!isDeviceRemoved && statusCode !== DisconnectReason.loggedOut)
        );
      // force a clean slate only on real logout/device removal or repeated timeouts
      const shouldResetAuth =
        isDeviceRemoved ||
        (isKeepAliveTimeout && failureCount >= 3) ||
        (isConnectionTerminated && failureCount >= 3);

      if (shouldResetAuth) {
        await deleteLocalSessionRecord(clinicId);
      }

      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: isIntentionalLogout
          ? 'disconnected'
          : (isQrTimeout || isStreamRestart || isConnectionTerminated ? 'connecting' : 'disconnected'),
        lastError: (isQrTimeout || isStreamRestart || isConnectionTerminated || isIntentionalLogout) ? null : message,
        qrCode: null,
        authStateEncrypted: shouldResetAuth ? null : undefined
      });

      // Drop the stale socket so a fresh connection (manual or auto) will create a new QR.
      activeSessions.delete(String(clinicId));

      if (shouldResetAuth) {
        await removeDir(authDir);
        sessionTempDirs.delete(String(clinicId));
        reconnectFailures.set(String(clinicId), 0);
      }

      if (!shouldReconnect) {
        await removeDir(authDir);
        return;
      }

      const reconnectDelayMs = isQrTimeout ? 500 : isStreamRestart ? 1000 : 1500;
      // Add modest exponential backoff for repeated failures (except QR renewals)
      const baseDelay = isQrTimeout ? reconnectDelayMs : Math.min(1000 * (2 ** Math.max(0, failureCount - 1)), 10000);
      const jitter = isQrTimeout ? 0 : Math.floor(Math.random() * 250);
      const effectiveDelay = isQrTimeout ? reconnectDelayMs : baseDelay + jitter;
      if (isQrTimeout) {
        logger.info({ clinicId }, 'QR expired before scan; regenerating a fresh code');
      }
      if (isStreamRestart) {
        logger.info({ clinicId }, 'Stream restart requested by WhatsApp; reconnecting with saved auth');
      }
      if (shouldResetAuth && !isDeviceRemoved) {
        logger.info({ clinicId }, 'Auth reset after repeated timeouts; new QR will be generated');
      }

      setTimeout(() => {
        connectSession(clinicId).catch((error) => {
          logger.error({ clinicId, error }, 'Failed to auto-reconnect WhatsApp session');
        });
      }, effectiveDelay);
    }
  });

  socket.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages || []) {
      if (!message?.message || message.key?.fromMe) {
        continue;
      }

      const preview =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        message.message?.documentMessage?.caption ||
        '';
      // console.log('Incoming personal message', {
      //   clinicId,
      //   from: message.key?.remoteJid,
      //   text: preview
      // });

      // Prefer explicit phone-normalized fields (senderPn / participantPn). Fallback to sender/remote only if absent.
      let pickJid = null;
      if (message.key?.senderPn) {
        pickJid = message.key.senderPn;
      } else if (message.senderPn) {
        pickJid = message.senderPn;
      } else if (message.key?.participantPn) {
        pickJid = message.key.participantPn;
      } else if (message.participantPn) {
        pickJid = message.participantPn;
      } else {
        const candidates = [
          message.sender,
          message.participant,
          message.key?.sender,
          message.key?.participant,
          message.key?.remoteJid
        ].filter(Boolean);

        pickJid =
          candidates.find((jid) => typeof jid === 'string' && jid.includes('@s.whatsapp.net')) ||
          candidates.find((jid) => typeof jid === 'string' && jid.includes('@lid')) ||
          candidates[0] ||
          '';
      }

      const normalizedJid = pickJid ? jidNormalizedUser(pickJid) : '';
      const fromId = normalizedJid ? normalizedJid.split('@')[0] : '';
      const from = fromId ? (fromId.startsWith('+') ? fromId : `+${fromId}`) : '';

      // Immediate auto-ack from the bridge socket (mirrors frontend/manual sends)
      if (normalizedJid && !message.key.fromMe) {
        const autoAckText = config.autoAckText || 'I got your message. I will respond asap!!!';
        try {
          await socket.sendMessage(normalizedJid, { text: autoAckText });
          logger.info({ clinicId, to: normalizedJid, autoAck: true }, 'Bridge auto-ack sent');
        } catch (err) {
          logger.warn({ clinicId, to: normalizedJid, err }, 'Bridge auto-ack failed');
        }
      }
      // return;
      const payload = extractMessageText(message);
      const contactName =
        message.pushName ||
        message.message?.contactMessage?.displayName ||
        null;
      if (!from || (!payload.text && !payload.metadata.mediaType)) {
        continue;
      }

      try {
        await notifyBackend({
          clinicId,
          type: 'message.received',
          from,
          contactName,
          fromJid: normalizedJid || null,
          senderPn: message.key?.senderPn || message .senderPn || null,
          text: payload.text,
          metadata: payload.metadata,
          messageId: message.key?.id || null
        });
      } catch (error) {
        logger.error({ clinicId, error }, 'Failed to forward inbound WhatsApp message to backend');
      }
    }
  });
};

const connectSession = async (clinicId) => {
  const existing = activeSessions.get(String(clinicId));
  if (existing?.socket) {
    logger.info({ clinicId }, 'WhatsApp session already active; reusing socket');
    const record = await getSessionRecord(clinicId);
    return {
      provider: 'wa_web',
      status: record?.status || 'connecting',
      qrCode: record?.qr_code || null,
      deviceJid: record?.device_jid || null,
      lastConnectedAt: record?.last_connected_at || null,
      lastError: record?.last_error || null
    };
  }

  const authDir = await getOrCreateSessionDir(clinicId);
  await restoreAuthState(clinicId, authDir);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ clinicId }, 'Connecting WhatsApp session');

  const socket = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterCache: msgRetryCache,
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: false,
    emitOwnEvents: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    getMessage: async () => undefined,
    logger,
    printQRInTerminal: false,
    qrTimeout: config.qrTimeoutMs,
    browser: ['Clinic Follow-ups', 'Chrome', '1.0.0']
  });

  activeSessions.set(String(clinicId), { socket, authDir });
  await attachSocketHandlers(clinicId, socket, authDir, saveCreds);
  await upsertSessionRecord(clinicId, {
    provider: 'wa_web',
    status: 'connecting',
    lastError: null
  });

  const record = await getSessionRecord(clinicId);
  logger.info({ clinicId, status: record?.status || 'connecting', deviceJid: record?.device_jid || null }, 'WhatsApp session connected or awaiting QR');
  return {
    provider: 'wa_web',
    status: record?.status || 'connecting',
    qrCode: record?.qr_code || null,
    deviceJid: record?.device_jid || null,
    lastConnectedAt: record?.last_connected_at || null,
    lastError: record?.last_error || null
  };
};

const getSessionStatus = async (clinicId) => {
  const record = await getSessionRecord(clinicId);
  return {
    provider: 'wa_web',
    status: record?.status || 'disconnected',
    qrCode: record?.qr_code || null,
    deviceJid: record?.device_jid || null,
    lastConnectedAt: record?.last_connected_at || null,
    lastError: record?.last_error || null
  };
};

const disconnectSession = async (clinicId) => {
  const active = activeSessions.get(String(clinicId));
  if (active?.socket) {
    try {
      await active.socket.logout();
    } catch (_error) {
      // Ignore and continue cleanup.
    }
  }

  activeSessions.delete(String(clinicId));
  const authDir =
    active?.authDir ||
    await getKnownSessionDir(clinicId);
  await removeDir(authDir);
  sessionTempDirs.delete(String(clinicId));
  reconnectFailures.delete(String(clinicId));
  sendQueues.delete(String(clinicId));
  await deleteLocalSessionRecord(clinicId);
  await upsertSessionRecord(clinicId, {
    provider: 'wa_web',
    status: 'disconnected',
    authStateEncrypted: null,
    qrCode: null,
    deviceJid: null,
    lastError: null
  });

  logger.info({ clinicId }, 'WhatsApp session disconnected and cleared');
  return { success: true };
};

const sendMessage = async ({ clinicId, to, toJid, toPn, body, mediaUrl, templateParameters }) => {
  let active = activeSessions.get(String(clinicId));
  if (!active?.socket) {
    await connectSession(clinicId);
    active = activeSessions.get(String(clinicId));
  }

  if (!active?.socket) {
    throw new Error('WhatsApp Web session is not active');
  }

  const jid = resolveJid({ to, toJid, toPn });
  const renderTemplate = (template = '', params = {}) => {
    if (!template || !params) return template;
    return String(template).replace(/\{(\w+)\}/g, (_m, key) => {
      const val = params[key];
      return val === undefined || val === null ? `{${key}}` : String(val);
    });
  };

  const templateParams = templateParameters || {};
  const renderedBody = renderTemplate(body || '', templateParams);

  const message = mediaUrl
    ? inferMediaMessage(mediaUrl, renderedBody)
    : { text: renderedBody };

  const runQueued = (fn) => {
    const key = String(clinicId);
    const prior = sendQueues.get(key) || Promise.resolve();
    const next = prior.catch(() => {}).then(() => fn());
    // store a silent tail to keep the chain alive but avoid unhandled rejections
    sendQueues.set(key, next.catch(() => {}));
    return next;
  };

  const response = await runQueued(() => active.socket.sendMessage(jid, message));
  logger.info({ clinicId, to: jid, messageId: response?.key?.id || null, media: Boolean(mediaUrl) }, 'WhatsApp message sent');
  return {
    messageId: response?.key?.id || null,
    status: 'sent'
  };
};

const restoreExistingSessions = async () => {
  try {
    const clinicIds = await listPersistedSessionIds();
    logger.info({ count: clinicIds.length }, 'Restoring WhatsApp sessions from disk');
    for (const clinicId of clinicIds) {
      connectSession(clinicId).catch((err) => {
        logger.error({ clinicId, error: err }, 'Failed to restore WhatsApp session');
      });
    }
  } catch (err) {
    // Log and continue without crash if restore fails.
    logger.error({ error: err }, 'Failed to fetch existing WhatsApp sessions');
    return;
  }
};

module.exports = {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage,
  restoreExistingSessions
};
