const fs = require('fs');
const path = require('path');
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
const { query } = require('./db');
const { encrypt, decrypt } = require('./crypto');

// Allow overriding the on-disk auth directory; default stays under repo for local dev.
const resolveSessionsDir = () => {
  const custom = String(process.env.WA_WEB_SESSIONS_DIR || '').trim();
  if (!custom) {
    return path.join(__dirname, '..', 'data', 'sessions');
  }
  return path.isAbsolute(custom)
    ? custom
    : path.join(__dirname, '..', custom);
};

const DATA_DIR = resolveSessionsDir();
const SESSION_MAP_FILE = path.join(DATA_DIR, 'session_map.json');
// Default to warn to reduce Baileys verbose session logs (can override via LOG_LEVEL).
const logger = P({ level: process.env.LOG_LEVEL || 'warn' });
const activeSessions = new Map();
let sessionDirMapCache = null;

const ensureDir = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const removeDir = async (dir) => {
  await fs.promises.rm(dir, { recursive: true, force: true });
};

const loadSessionDirMap = async () => {
  if (sessionDirMapCache) {
    return sessionDirMapCache;
  }

  try {
    const raw = await fs.promises.readFile(SESSION_MAP_FILE, 'utf8');
    sessionDirMapCache = JSON.parse(raw);
  } catch (_err) {
    sessionDirMapCache = {};
  }
  return sessionDirMapCache;
};

const saveSessionDirMap = async () => {
  if (!sessionDirMapCache) {
    return;
  }
  await ensureDir(DATA_DIR);
  await fs.promises.writeFile(
    SESSION_MAP_FILE,
    JSON.stringify(sessionDirMapCache, null, 2)
  );
};

const migrateOldClinicDir = async (clinicId, targetDir) => {
  const legacyDir = path.join(DATA_DIR, String(clinicId));
  if (!fs.existsSync(legacyDir) || legacyDir === targetDir) {
    return;
  }

  await ensureDir(path.dirname(targetDir));
  try {
    await fs.promises.rename(legacyDir, targetDir);
  } catch (_err) {
    // Cross-device rename fallback: copy then delete.
    await fs.promises.cp(legacyDir, targetDir, { recursive: true });
    await removeDir(legacyDir);
  }
};

const getOrCreateSessionDir = async (clinicId) => {
  await ensureDir(DATA_DIR);
  const map = await loadSessionDirMap();
  const key = String(clinicId);

  if (!map[key]) {
    map[key] = crypto.randomUUID();
    await saveSessionDirMap();
  }

  const target = path.join(DATA_DIR, map[key]);
  await migrateOldClinicDir(key, target);
  await ensureDir(target);
  return target;
};

const getKnownSessionDir = async (clinicId) => {
  const map = await loadSessionDirMap();
  const key = String(clinicId);
  if (map[key]) {
    return path.join(DATA_DIR, map[key]);
  }
  // Fallback to legacy naming if map entry is missing.
  return path.join(DATA_DIR, key);
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
  const result = await query(
    `SELECT *
     FROM whatsapp_sessions
     WHERE clinic_id = $1
     LIMIT 1`,
    [clinicId]
  );
  return result.rows[0] || null;
};

const upsertSessionRecord = async (clinicId, patch = {}) => {
  const existing = await getSessionRecord(clinicId);
  if (!existing) {
    const result = await query(
      `INSERT INTO whatsapp_sessions (
        clinic_id,
        provider,
        status,
        auth_state_encrypted,
        qr_code,
        device_jid,
        last_connected_at,
        last_error
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        clinicId,
        patch.provider || 'wa_web',
        patch.status || 'disconnected',
        patch.authStateEncrypted || null,
        patch.qrCode || null,
        patch.deviceJid || null,
        patch.lastConnectedAt || null,
        patch.lastError || null
      ]
    );
    return result.rows[0];
  }

  const fields = [];
  const values = [];
  let index = 1;
  const mapping = {
    provider: 'provider',
    status: 'status',
    authStateEncrypted: 'auth_state_encrypted',
    qrCode: 'qr_code',
    deviceJid: 'device_jid',
    lastConnectedAt: 'last_connected_at',
    lastError: 'last_error'
  };

  for (const [key, dbField] of Object.entries(mapping)) {
    if (patch[key] === undefined) {
      continue;
    }
    fields.push(`${dbField} = $${index}`);
    values.push(patch[key]);
    index++;
  }

  if (!fields.length) {
    return existing;
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(clinicId);

  const result = await query(
    `UPDATE whatsapp_sessions
     SET ${fields.join(', ')}
     WHERE clinic_id = $${index}
     RETURNING *`,
    values
  );
  return result.rows[0];
};

const notifyBackend = async (payload) => {
  const backendUrl = String(process.env.WA_BACKEND_URL || '').trim();
  if (!backendUrl) {
    return;
  }

  const body = payload || {};
  const timestamp = Date.now();
  const headers = {
    'x-bridge-timestamp': timestamp
  };

  if (process.env.WA_WEB_BACKEND_SHARED_SECRET) {
    const secret = process.env.WA_WEB_BACKEND_SHARED_SECRET;
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
  if (!record?.auth_state_encrypted) {
    await removeDir(dir);
    await ensureDir(dir);
    return;
  }

  const decrypted = decrypt(record.auth_state_encrypted);
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
      const isDeviceRemoved =
        statusCode === 401 ||
        statusCode === DisconnectReason.loggedOut ||
        /device_removed|logged\s*out|conflict/i.test(message || '');
      const shouldReconnect = !isDeviceRemoved && statusCode !== DisconnectReason.loggedOut;

      await upsertSessionRecord(clinicId, {
        provider: 'wa_web',
        status: 'disconnected',
        lastError: message,
        qrCode: null
      });

      // Drop the stale socket so a fresh connection (manual or auto) will create a new QR.
      activeSessions.delete(String(clinicId));

      if (!shouldReconnect) {
        await removeDir(authDir);
        return;
      }

      setTimeout(() => {
        connectSession(clinicId).catch((error) => {
          logger.error({ clinicId, error }, 'Failed to auto-reconnect WhatsApp session');
        });
      }, 3000);
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
        const autoAckText = process.env.WA_WEB_AUTO_ACK_TEXT || 'I got your message. I will respond asap!!!';
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

const sendMessage = async ({ clinicId, to, body, mediaUrl }) => {
  let active = activeSessions.get(String(clinicId));
  if (!active?.socket) {
    await connectSession(clinicId);
    active = activeSessions.get(String(clinicId));
  }

  if (!active?.socket) {
    throw new Error('WhatsApp Web session is not active');
  }

  const jid = jidForPhone(to);
  const message = mediaUrl
    ? inferMediaMessage(mediaUrl, body)
    : { text: body };

  const response = await active.socket.sendMessage(jid, message);
  return {
    messageId: response?.key?.id || null,
    status: 'sent'
  };
};

const restoreExistingSessions = async () => {
  await ensureDir(DATA_DIR);
  const result = await query(
    `SELECT clinic_id
     FROM whatsapp_sessions
     WHERE provider = 'wa_web'
       AND auth_state_encrypted IS NOT NULL`
  );

  for (const row of result.rows) {
    connectSession(row.clinic_id).catch((error) => {
      logger.error({ clinicId: row.clinic_id, error }, 'Failed to restore WhatsApp session');
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
