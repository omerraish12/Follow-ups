const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load env *before* any other modules so DB creds are available.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  ensureBridge,
  getBridgeState,
  sendWelcomeMessage
} = require('./singleBridge');
const {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage,
  restoreExistingSessions
} = require('./manager');

const app = express();
const port = parseInt(process.env.PORT || '5050', 10);
const bridgeApiKey = String(process.env.WA_WEB_BRIDGE_API_KEY || '').trim();
if (!bridgeApiKey) {
  console.error('WA_WEB_BRIDGE_API_KEY is required for the WhatsApp bridge. Set it in the environment.');
  process.exit(1);
}

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }

  const incoming = String(req.headers['x-bridge-api-key'] || '').trim();
  if (incoming !== bridgeApiKey) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/bridge/state', (_req, res) => {
  res.json(getBridgeState());
});

app.post('/bridge/start', async (_req, res) => {
  try {
    await ensureBridge();
    res.json(getBridgeState());
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to start bridge' });
  }
});

app.post('/bridge/welcome', async (req, res) => {
  const { phone, name } = req.body || {};
  if (!phone) {
    res.status(400).json({ message: 'phone is required' });
    return;
  }

  try {
    await sendWelcomeMessage(phone, name);
    res.json({ status: 'sent' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to send welcome message' });
  }
});

app.post('/sessions/:clinicId/connect', async (req, res) => {
  try {
    console.log("trying to connect to: ", req.params.clinicId);
    const response = await connectSession(req.params.clinicId);
    console.log("One session is connecting: ", req.params.clinicId, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to connect WhatsApp session' });
  }
});

app.get('/sessions/:clinicId', async (req, res) => {
  try {
    const response = await getSessionStatus(req.params.clinicId);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch WhatsApp session' });
  }
});

app.post('/sessions/:clinicId/disconnect', async (req, res) => {
  try {
    const response = await disconnectSession(req.params.clinicId);
    console.log("One session is disconnected: ", req.params.clinicId, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to disconnect WhatsApp session' });
  }
});

app.post('/messages/send', async (req, res) => {
  try {
    const response = await sendMessage(req.body || {});
    console.log("One session sent message: ", req.body, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to send WhatsApp message' });
  }
});

restoreExistingSessions()
  .catch((error) => {
    console.error('Failed to restore WhatsApp sessions:', error);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`WhatsApp bridge service listening on port ${port}`);
    });
  });
