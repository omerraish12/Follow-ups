const { query } = require('../config/database');

class IntegrationLog {
    static async create({ type, level = 'error', message, metadata = null, clinicId = null }) {
        const result = await query(
            `INSERT INTO integration_logs (type, level, message, metadata, clinic_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [type, level, message, metadata, clinicId]
        );
        return result.rows[0];
    }

    static async findRecent(clinicId, limit = 20) {
        const result = await query(
            `SELECT * FROM integration_logs
             WHERE clinic_id = $1 OR clinic_id IS NULL
             ORDER BY created_at DESC
             LIMIT $2`,
            [clinicId, limit]
        );
        return result.rows;
    }
}

module.exports = IntegrationLog;
