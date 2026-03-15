const express = require('express');
const { handleContractWebhook, contractWebhookValidation } = require('../controllers/contractController');

const router = express.Router();

// Webhook for contract → lead import
router.post('/webhook', contractWebhookValidation, handleContractWebhook);

module.exports = router;
