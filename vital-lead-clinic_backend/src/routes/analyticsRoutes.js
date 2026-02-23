const express = require('express');
const {
    getKPI,
    getStatusDistribution,
    getSourcePerformance,
    getWeeklyActivity,
    getTeamPerformance
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/kpi', getKPI);
router.get('/status-distribution', getStatusDistribution);
router.get('/source-performance', getSourcePerformance);
router.get('/weekly-activity', getWeeklyActivity);
router.get('/team-performance', getTeamPerformance);

module.exports = router;