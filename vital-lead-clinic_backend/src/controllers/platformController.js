const { query } = require('../config/database');

const getClinicsOverview = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                c.integration_settings,
                COALESCE(l.count, 0) as lead_count
             FROM clinics c
             LEFT JOIN (
                SELECT clinic_id, COUNT(*) as count
                FROM leads
                GROUP BY clinic_id
             ) l ON l.clinic_id = c.id
             ORDER BY c.name ASC`
        );

        const clinics = result.rows.map((clinic) => {
            const integrations = clinic.integration_settings || {};
            const whatsapp = integrations.whatsapp || {};
            const isProvisioned = Boolean(whatsapp.accountSid && whatsapp.authToken);

            return {
                id: clinic.id,
                name: clinic.name,
                email: clinic.email,
                phone: clinic.phone,
                address: clinic.address,
                status: whatsapp.status || 'disconnected',
                twilioProvisioned: isProvisioned,
                whatsappFrom: whatsapp.whatsappFrom || whatsapp.sender || null,
                messagingServiceSid: whatsapp.messagingServiceSid || null,
                lastConnectedAt: whatsapp.lastConnectedAt || null,
                updatedAt: whatsapp.updatedAt || null,
                leads: parseInt(clinic.lead_count, 10) || 0
            };
        });

        res.json({ clinics });
    } catch (error) {
        console.error('Error fetching clinics for super admin:', error);
        res.status(500).json({ message: 'Unable to load clinics' });
    }
};

const getPlatformAnalytics = async (req, res) => {
    try {
        const COST_PER_MESSAGE_USD = parseFloat(process.env.TWILIO_MESSAGE_COST_USD) || 0.01;

        const totalsResult = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE m.type = 'SENT') AS total_sent,
                COUNT(*) FILTER (WHERE m.type = 'RECEIVED') AS total_received
             FROM messages m
             JOIN leads l ON m.lead_id = l.id`
        );
        const totalsRow = totalsResult.rows[0] || {};
        const totalSent = parseInt(totalsRow.total_sent, 10) || 0;
        const totalReceived = parseInt(totalsRow.total_received, 10) || 0;
        const totalMessages = totalSent + totalReceived;
        const estimatedCostUsd = parseFloat((totalSent * COST_PER_MESSAGE_USD).toFixed(2));

        const last30DaysResult = await query(
            `SELECT 
                (date_trunc('day', m.timestamp))::date AS day,
                COUNT(*) FILTER (WHERE m.type = 'SENT') AS sent,
                COUNT(*) FILTER (WHERE m.type = 'RECEIVED') AS received
             FROM messages m
             JOIN leads l ON m.lead_id = l.id
             WHERE m.timestamp >= CURRENT_DATE - INTERVAL '29 days'
             GROUP BY day
             ORDER BY day ASC`
        );

        const dayMap = new Map();
        last30DaysResult.rows.forEach((row) => {
            const dayKey = row.day instanceof Date ? row.day.toISOString().split('T')[0] : String(row.day);
            dayMap.set(dayKey, {
                day: dayKey,
                sent: parseInt(row.sent, 10) || 0,
                received: parseInt(row.received, 10) || 0
            });
        });

        const last30Days = [];
        const now = new Date();
        for (let offset = 29; offset >= 0; offset -= 1) {
            const target = new Date(now);
            target.setDate(now.getDate() - offset);
            const dayKey = target.toISOString().split('T')[0];
            const entry = dayMap.get(dayKey) || { day: dayKey, sent: 0, received: 0 };
            last30Days.push({
                ...entry,
                total: (entry.sent || 0) + (entry.received || 0)
            });
        }

        const perClinicResult = await query(
            `SELECT 
                c.id,
                c.name,
                COALESCE(SUM(CASE WHEN m.type = 'SENT' THEN 1 ELSE 0 END), 0) AS sent,
                COALESCE(SUM(CASE WHEN m.type = 'RECEIVED' THEN 1 ELSE 0 END), 0) AS received,
                COALESCE(lc.lead_count, 0) AS leads
             FROM clinics c
             LEFT JOIN leads l ON l.clinic_id = c.id
             LEFT JOIN messages m ON m.lead_id = l.id
             LEFT JOIN (
                 SELECT clinic_id, COUNT(*) AS lead_count
                 FROM leads
                 GROUP BY clinic_id
             ) lc ON lc.clinic_id = c.id
             GROUP BY c.id, c.name, lc.lead_count
             ORDER BY sent DESC NULLS LAST`
        );

        const clinics = perClinicResult.rows.map((row) => ({
            id: row.id,
            name: row.name,
            sent: parseInt(row.sent, 10) || 0,
            received: parseInt(row.received, 10) || 0,
            leads: parseInt(row.leads, 10) || 0
        }));

        res.json({
            totals: {
                totalSent,
                totalReceived,
                totalMessages,
                estimatedCostUsd,
                costPerMessageUsd: COST_PER_MESSAGE_USD
            },
            messagesLast30Days: last30Days,
            clinics,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching platform analytics:', error);
        res.status(500).json({ message: 'Unable to calculate platform analytics.' });
    }
};

module.exports = {
    getClinicsOverview,
    getPlatformAnalytics
};
