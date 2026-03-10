const express = require('express');
const {
  verifyWebhook,
  handleWebhook,
  handleBridgeEvent,
  sendTemplate,
  getLatestLeadMessageTimestamp,
  getSenderInfo,
  connectSession,
  getSessionStatus,
  getSessionQr,
  disconnectSession,
  getFAQ
} = require('../controllers/whatsappController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// WhatsApp Web bridge inbound events (public)
router.post('/bridge/events', handleBridgeEvent);

// Outbound send (protected)
router.post('/send-template', protect, sendTemplate);
router.get('/latest-message', protect, getLatestLeadMessageTimestamp);
router.get('/sender', protect, getSenderInfo);
router.post('/sessions/connect', protect, connectSession);
router.get('/sessions/status', protect, getSessionStatus);
router.get('/sessions/qr', protect, getSessionQr);
router.post('/sessions/disconnect', protect, disconnectSession);
router.get('/faq', protect, getFAQ);

module.exports = router;
