const { query } = require('../config/database');

// Returns lightweight stats for contract + WhatsApp history imports per clinic
const getImportStatus = async (req, res) => {
    try {
        const clinicId = req.user.clinic_id;

        const sql = `
          SELECT
            (SELECT COUNT(*) FROM leads WHERE clinic_id = $1::int AND source = 'contract_webhook') AS contract_leads,
            (SELECT COUNT(*) FROM integration_logs WHERE clinic_id = $1::int AND type = 'contract_webhook' AND level = 'error') AS contract_errors,
            (SELECT COUNT(*) FROM integration_logs WHERE clinic_id = $1::int AND type = 'contract_webhook' AND level <> 'error') AS contract_events,
            (SELECT COUNT(*) FROM leads WHERE clinic_id = $1::int AND source = 'whatsapp_history') AS history_leads,
            (SELECT COUNT(*) FROM messages m JOIN leads l ON m.lead_id = l.id WHERE l.clinic_id = $1::int AND m.message_origin = 'history') AS history_messages
        `;

        const result = await query(sql, [clinicId]);
        const row = result.rows?.[0] || {};
        if (process.env.NODE_ENV !== 'production') {
            console.info('[imports] status', { clinicId, row });
        }

        res.json({
            contracts: {
                leads: Number(row.contract_leads || 0),
                errors: Number(row.contract_errors || 0),
                events: Number(row.contract_events || 0)
            },
            whatsappHistory: {
                leads: Number(row.history_leads || 0),
                messages: Number(row.history_messages || 0)
            }
        });
    } catch (error) {
        console.error('Import status error:', error);
        res.status(500).json({ message: 'Unable to load import status' });
    }
};

module.exports = {
    getImportStatus,
    runImports: async (req, res) => {
        try {
            const clinicId = req.user.clinic_id;
            // No external pull is possible here; we mark intent and let bridge/webhooks handle actual ingestion.
            await query(
                `INSERT INTO integration_logs (type, level, message, metadata, clinic_id)
                 VALUES ('manual_import_trigger', 'info', 'User requested import of contracts and whatsapp history', $1::jsonb, $2::int)`,
                [{ userId: req.user.id }, clinicId]
            );
            if (process.env.NODE_ENV !== 'production') {
                console.info('[imports] manual trigger', { clinicId, userId: req.user.id });
            }
            return res.json({ success: true, message: 'Import trigger recorded; background services will continue syncing.' });
        } catch (error) {
            console.error('Import run error:', error);
            return res.status(500).json({ message: 'Unable to trigger import' });
        }
    }
};
