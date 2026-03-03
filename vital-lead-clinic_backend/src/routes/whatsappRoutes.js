const express = require('express');
const { verifyWebhook, handleWebhook, sendTemplate, getLatestLeadMessageTimestamp, getSenderInfo, getFAQ } = require('../controllers/whatsappController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Meta webhook verification + inbound events (public)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Outbound send (protected)
router.post('/send-template', protect, sendTemplate);

router.get('/latest-message', protect, getLatestLeadMessageTimestamp);
router.get('/sender', protect, getSenderInfo);
router.get('/faq', protect, getFAQ);

module.exports = router;
