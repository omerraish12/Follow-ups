const express = require('express');
const { getClinicsOverview, getPlatformAnalytics } = require('../controllers/platformController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.get('/clinics', getClinicsOverview);
router.get('/analytics', getPlatformAnalytics);

module.exports = router;
