const IntegrationLog = require('../models/IntegrationLog');

// @desc    Get recent integration/system logs
// @route   GET /api/logs/system-errors
const getSystemLogs = async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    try {
        const logs = await IntegrationLog.findRecent(req.user.clinic_id, limit);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching system logs:', error);
        res.status(500).json({ message: 'Unable to fetch logs' });
    }
};

module.exports = {
    getSystemLogs
};
