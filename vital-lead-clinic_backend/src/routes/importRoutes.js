const express = require('express');
const { protect } = require('../middleware/auth');
const { getImportStatus, runImports } = require('../controllers/importController');

const router = express.Router();

router.use(protect);
router.get('/status', getImportStatus);
router.post('/run', runImports);

module.exports = router;
