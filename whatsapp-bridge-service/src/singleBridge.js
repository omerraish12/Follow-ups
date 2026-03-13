const fs = require('fs');
const path = require('path');
const pino = require('pino');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { config } = require('./config');

const state = {
  status: 'idle',
  qrImage: null,
  lastError: null
};

let socket = null;
let starting = false;

const resolveAuthDir = () => {
  const custom = config.singleAuthDir ? String(config.singleAuthDir).trim() : '';
  const base = custom
    ? (path.isAbsolute(custom) ? custom : path.join(__dirname, '..', custom))
    : null;
  const dir = base || fs.mkdtempSync(path.join(require('os').tmpdir(), 'wa-single-'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const AUTH_DIR = resolveAuthDir();
const logger = pino({ level: config.logLevel });

const resetAuthDir = async () => {
  await fs.promises.rm(AUTH_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(AUTH_DIR, { recursive: true });
};

const phoneToJid = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) {
    throw new Error('Phone number is required');
  }
  return `${digits}@s.whatsapp.net`;
};

const startBridge = async () => {
  if (starting || socket) {
    return;
  }

  starting = true;
  state.status = 'connecting';
  state.lastError = null;

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: authState,
      logger,
      browser: ['Clinic Follow-ups', 'Chrome', '1.0.0']
    });

    socket = sock;

    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    sock.ev.on('connection.update', async ({ qr, connection, lastDisconnect }) => {
      if (qr) {
        try {
          state.qrImage = await QRCode.toDataURL(qr, { margin: 1 });
        } catch (err) {
          logger.warn({ err }, 'Failed to render QR to data URL');
          state.qrImage = null;
        }
        state.status = 'qr';
      }

      if (connection === 'open') {
        state.status = 'ready';
        state.qrImage = null;
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode ||
          lastDisconnect?.error?.data?.statusCode ||
          null;
        const message = lastDisconnect?.error?.message || 'Disconnected';
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        state.lastError = message;
        socket = null;
        starting = false;

        if (shouldReconnect) {
          state.status = 'reconnecting';
          setTimeout(() => {
            startBridge().catch((err) => {
              logger.error({ err }, 'Failed to auto-restart single bridge');
            });
          }, 2000);
        } else {
          state.status = 'error';
          await resetAuthDir();
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg || msg.key?.fromMe) {
        return;
      }

      const jid = msg.key?.remoteJid;
      if (!jid || String(jid).endsWith('@broadcast')) {
        return;
      }

      try {
        await sock.sendMessage(jid, { text: 'Great' });
      } catch (err) {
        state.lastError = err.message;
      }
    });
  } catch (err) {
    state.status = 'error';
    state.lastError = err.message;
    socket = null;
    throw err;
  } finally {
    starting = false;
  }
};

const ensureBridge = async () => {
  if (socket || starting) {
    return;
  }
  await startBridge();
};

const getBridgeState = () => ({ ...state });

const sendWelcomeMessage = async (phone, name) => {
  if (!socket) {
    await ensureBridge();
  }
  if (!socket) {
    throw new Error('Bridge is not ready yet');
  }
  if (state.status !== 'ready') {
    throw new Error('Bridge is not ready yet. Scan the QR code first.');
  }

  const jid = phoneToJid(phone);
  const message =
    name && String(name).trim().length
      ? `Hi ${name}, you are now linked to our clinic. Reply here if you need help.`
      : 'You are now linked to our clinic. Reply here if you need help.';

  await socket.sendMessage(jid, { text: message });
};

const isReady = () => state.status === 'ready';

module.exports = {
  ensureBridge,
  getBridgeState,
  sendWelcomeMessage,
  isReady
};
