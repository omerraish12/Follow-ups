const Lead = require('../models/Lead');
const Automation = require('../models/Automation');
const User = require('../models/User');
const { query } = require('../config/database');

// @desc    Get clinic messages within a recent window (default 3 months)
// @route   GET /api/analytics/clinic-messages?months=3
const getClinicMessages = async (req, res) => {
    try {
        const clinicId = req.user.clinic_id;
        const months = Math.min(Math.max(parseInt(req.query.months || '3', 10) || 3, 1), 12);

        const result = await query(
            `SELECT 
                m.*,
                l.name AS lead_name,
                l.phone AS lead_phone,
                l.status AS lead_status
             FROM messages m
             JOIN leads l ON l.id = m.lead_id
             WHERE l.clinic_id = $1::int
               AND m.timestamp >= NOW() - ($2 || ' months')::interval
             ORDER BY m.timestamp DESC`,
            [clinicId, months]
        );

        res.json({
            months,
            count: result.rowCount,
            messages: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get dashboard KPI data
// @route   GET /api/analytics/kpi
const getKPI = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const clinicId = req.user.clinic_id;

        // Date range start
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'quarter':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = new Date(now.setMonth(now.getMonth() - 1));
        }

        // Lead stats scoped to period
        const stats = await Lead.getStats(clinicId, startDate);

        // Follow-up list (existing heuristic)
        const followupNeeded = await Lead.getFollowupNeeded(clinicId);

        // Average hours since last contact (all leads with last_contacted)
        const responseResult = await query(
            `SELECT AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_contacted)) / 3600) AS avg_hours
             FROM leads
             WHERE clinic_id = $1::int AND last_contacted IS NOT NULL`,
            [clinicId]
        );

        const avgResponseHours = parseFloat(responseResult.rows[0]?.avg_hours) || 0;

        // Returned leads in period using simple keyword detection
        const returnKeywords = [
            '%return%',
            '%returned%',
            '%חוזר%',
            '%חזרתי%',
            '%שוב%',
            '%חוזרת%'
        ];
        const keywordClauses = returnKeywords
            .map((_kw, idx) => `m.content ILIKE $${idx + 3}`)
            .join(' OR ');
        const returnedResult = await query(
            `SELECT COUNT(DISTINCT m.lead_id) as count 
             FROM messages m
             JOIN leads l ON l.id = m.lead_id
             WHERE l.clinic_id = $1::int
               AND m.timestamp >= $2::timestamptz
               AND (${keywordClauses})`,
            [clinicId, startDate, ...returnKeywords]
        );
        const returnedLeads = parseInt(returnedResult.rows[0]?.count || 0, 10) || 0;

        const totalLeads = parseInt(stats.total) || 0;
        const returnRate = totalLeads > 0 ? (returnedLeads / totalLeads) * 100 : 0;

        res.json({
            totalLeads,
            newLeads: parseInt(stats.new) || 0,
            hotLeads: parseInt(stats.hot) || 0,
            closedLeads: parseInt(stats.closed) || 0,
            lostLeads: parseInt(stats.lost) || 0,
            totalRevenue: parseFloat(stats.revenue) || 0,
            followupNeeded: followupNeeded.length,
            returnedLeads,
            returnRate: Math.round(returnRate * 10) / 10,
            avgResponseHours,
            period
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get lead status distribution
// @route   GET /api/analytics/status-distribution
const getStatusDistribution = async (req, res) => {
    try {
        const distribution = await Lead.getStatusDistribution(req.user.clinic_id);
        res.json(distribution);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get lead source performance
// @route   GET /api/analytics/source-performance
const getSourcePerformance = async (req, res) => {
    try {
        const performance = await Lead.getSourcePerformance(req.user.clinic_id);
        res.json(performance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get weekly activity
// @route   GET /api/analytics/weekly-activity
const getWeeklyActivity = async (req, res) => {
    try {
        const activity = await Lead.getWeeklyActivity(req.user.clinic_id);

        // Map to Hebrew days
        const daysMap = {
            0: 'ראשון',
            1: 'שני',
            2: 'שלישי',
            3: 'רביעי',
            4: 'חמישי',
            5: 'שישי',
            6: 'שבת'
        };

        const weekly = activity.map(a => ({
            day: daysMap[a.day_of_week],
            leads: parseInt(a.count)
        }));

        res.json(weekly);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get team performance
// @route   GET /api/analytics/team-performance
const getTeamPerformance = async (req, res) => {
    try {
        const clinicId = Number(req.user.clinic_id);
        if (!Number.isFinite(clinicId)) {
            return res.status(400).json({ message: 'Invalid clinic id' });
        }

        const users = await User.getClinicUsers(clinicId);

        const performance = [];

        for (const user of users) {
            let leadStats;
            try {
                leadStats = await query(
                    `SELECT 
          COUNT(*) as assigned,
          COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as conversions,
          COALESCE(SUM(value), 0) as revenue
        FROM leads 
        WHERE assigned_to_id = $1::int`,
                    [user.id]
                );
            } catch (err) {
                console.error('leadStats error', err);
                throw err;
            }

            let activityCount;
            try {
                activityCount = await query(
                    `SELECT COUNT(*) as count 
         FROM activities 
         WHERE user_id = $1::int 
           AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
                    [user.id]
                );
            } catch (err) {
                console.error('activityCount error', err);
                throw err;
            }

            performance.push({
                id: user.id,
                name: user.name,
                role: user.role,
                leadsAssigned: parseInt(leadStats.rows[0].assigned) || 0,
                activitiesCount: parseInt(activityCount.rows[0].count) || 0,
                conversions: parseInt(leadStats.rows[0].conversions) || 0,
                revenue: parseFloat(leadStats.rows[0].revenue) || 0
            });
        }

        res.json(performance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getKPI,
    getStatusDistribution,
    getSourcePerformance,
    getWeeklyActivity,
    getTeamPerformance,
    getClinicMessages
};
