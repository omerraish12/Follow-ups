const express = require('express');
const dotenv = require('dotenv');
const {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage,
  restoreExistingSessions
} = require('./manager');

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5050', 10);
const bridgeApiKey = String(process.env.WA_WEB_BRIDGE_API_KEY || '').trim();

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  if (!bridgeApiKey) {
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

app.post('/sessions/:clinicId/connect', async (req, res) => {
  try {
    const response = await connectSession(req.params.clinicId);
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
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to disconnect WhatsApp session' });
  }
});

app.post('/messages/send', async (req, res) => {
  try {
    const response = await sendMessage(req.body || {});
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
