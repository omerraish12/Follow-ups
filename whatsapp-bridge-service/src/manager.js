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
  jidNormalizedUser
} = require('@whiskeysockets/baileys');
const { supabase } = require('./db');
const { encrypt, decrypt } = require('./crypto');
const { config } = require('./config');

// Runtime-only temp directories per clinic; state is persisted in Supabase.
const sessionTempDirs = new Map();
// Default to warn to reduce Baileys verbose session logs (can override via LOG_LEVEL).
const logger = P({ level: config.logLevel });
const activeSessions = new Map();
let sessionDirMapCache = null;

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const removeDir = async (dir) => {
  await fs.promises.rm(dir, { recursive: true, force: true });
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

const getSessionRecord = async (clinicId) => {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('clinic_id', clinicId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
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

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .upsert(base, { onConflict: 'clinic_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
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
    headers['x-bridge-secret'] = secret;
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
      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: 'connecting',
        qrCode: qr,
        lastError: null
      });
    }

    if (connection === 'open') {
      await persistAuthState(clinicId, authDir);
      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: 'connected',
        qrCode: null,
        deviceJid: socket.user?.id || null,
        lastConnectedAt: new Date().toISOString(),
        lastError: null
      });
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.statusCode ||
        lastDisconnect?.error?.data?.statusCode ||
        null;
      const message = lastDisconnect?.error?.message || 'WhatsApp Web session disconnected';
      const isQrTimeout =
        statusCode === DisconnectReason.timedOut ||
        /qr refs attempts ended/i.test(message || '');
      const isDeviceRemoved =
        statusCode === 401 ||
        statusCode === DisconnectReason.loggedOut ||
        /device_removed|logged\s*out|conflict/i.test(message || '');
      const shouldReconnect =
        isQrTimeout || (!isDeviceRemoved && statusCode !== DisconnectReason.loggedOut);

      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: isQrTimeout ? 'connecting' : 'disconnected',
        lastError: isQrTimeout ? null : message,
        qrCode: null
      });

      // Drop the stale socket so a fresh connection (manual or auto) will create a new QR.
      activeSessions.delete(String(clinicId));

      if (!shouldReconnect) {
        await removeDir(authDir);
        return;
      }

      const reconnectDelayMs = isQrTimeout ? 500 : 3000;
      if (isQrTimeout) {
        logger.info({ clinicId }, 'QR expired before scan; regenerating a fresh code');
      }

      setTimeout(() => {
        connectSession(clinicId).catch((error) => {
          logger.error({ clinicId, error }, 'Failed to auto-reconnect WhatsApp session');
        });
      }, reconnectDelayMs);
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

  const socket = makeWASocket({
    version,
    auth: state,
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
  await upsertSessionRecord(clinicId, {
    provider: 'wa_web',
    status: 'disconnected',
    authStateEncrypted: null,
    qrCode: null,
    deviceJid: null,
    lastError: null
  });

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

  const response = await active.socket.sendMessage(jid, message);
  return {
    messageId: response?.key?.id || null,
    status: 'sent'
  };
};

const restoreExistingSessions = async () => {
  let rows = [];
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('clinic_id')
      .eq('provider', 'wa_web')
      .not('auth_state_encrypted', 'is', null);

    if (error) {
      // If PostgREST schema cache is stale, log and continue without hard crash.
      if (error.code === 'PGRST205') {
        logger.warn('whatsapp_sessions table not in schema cache yet; skipping restore this boot');
        return;
      }
      throw error;
    }
    rows = data || [];
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch existing WhatsApp sessions');
    return;
  }

  for (const row of rows) {
    connectSession(row.clinic_id).catch((err) => {
      logger.error({ clinicId: row.clinic_id, error: err }, 'Failed to restore WhatsApp session');
    });
  }
};

module.exports = {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage,
  restoreExistingSessions
};
