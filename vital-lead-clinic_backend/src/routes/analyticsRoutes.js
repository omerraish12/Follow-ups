const express = require('express');
const {
    getKPI,
    getStatusDistribution,
    getSourcePerformance,
    getWeeklyActivity,
    getTeamPerformance,
    getClinicMessages
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/kpi', getKPI);
router.get('/status-distribution', getStatusDistribution);
router.get('/source-performance', getSourcePerformance);
router.get('/weekly-activity', getWeeklyActivity);
router.get('/team-performance', getTeamPerformance);
router.get('/clinic-messages', getClinicMessages);

module.exports = router;
