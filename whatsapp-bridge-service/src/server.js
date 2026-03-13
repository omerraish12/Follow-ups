const express = require('express');
const crypto = require('crypto');
const { config } = require('./config');
const { healthCheck } = require('./db');

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
const port = config.port;
const bridgeApiKey = config.bridgeApiKey;

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

const sendError = (res, status, message, code = undefined) => {
  res.status(status).json({
    message,
    code,
    requestId: res.locals.requestId
  });
};

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
  healthCheck()
    .then(() => {
      res.json({
        status: 'ok',
        db: 'up',
        timestamp: new Date().toISOString(),
        env: config.env
      });
    })
    .catch((err) => {
      res.status(503).json({
        status: 'degraded',
        db: 'down',
        message: err.message,
        timestamp: new Date().toISOString(),
        env: config.env
      });
    });
});

app.get('/bridge/state', (_req, res) => {
  res.json(getBridgeState());
});

app.post('/bridge/start', async (_req, res) => {
  try {
    await ensureBridge();
    res.json(getBridgeState());
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to start bridge');
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
    sendError(res, 500, error.message || 'Unable to send welcome message');
  }
});

app.post('/sessions/:clinicId/connect', async (req, res) => {
  try {
    console.log("trying to connect to: ", req.params.clinicId);
    const response = await connectSession(req.params.clinicId);
    console.log("One session is connecting: ", req.params.clinicId, response);
    res.json(response);
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to connect WhatsApp session');
  }
});

app.get('/sessions/:clinicId', async (req, res) => {
  try {
    const response = await getSessionStatus(req.params.clinicId);
    res.json(response);
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to fetch WhatsApp session');
  }
});

app.post('/sessions/:clinicId/disconnect', async (req, res) => {
  try {
    const response = await disconnectSession(req.params.clinicId);
    console.log("One session is disconnected: ", req.params.clinicId, response);
    res.json(response);
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to disconnect WhatsApp session');
  }
});

app.post('/messages/send', async (req, res) => {
  try {
    const response = await sendMessage(req.body || {});
    console.log("One session sent message: ", req.body, response);
    res.json(response);
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to send WhatsApp message');
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
