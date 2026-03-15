const express = require('express');
const { protect } = require('../middleware/auth');
const { getImportStatus } = require('../controllers/importController');

const router = express.Router();

router.use(protect);
router.get('/status', getImportStatus);

module.exports = router;
