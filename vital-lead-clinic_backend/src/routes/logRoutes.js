const express = require('express');
const { getSystemLogs } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/system-errors', getSystemLogs);

module.exports = router;
