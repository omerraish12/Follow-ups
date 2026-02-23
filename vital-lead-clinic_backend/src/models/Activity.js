const { query } = require('../config/database');

class Activity {
    static async create(activityData) {
        const { type, description, userId, leadId } = activityData;
        const result = await query(
            `INSERT INTO activities (type, description, user_id, lead_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [type, description, userId, leadId]
        );
        return result.rows[0];
    }

    static async findByUserId(userId, limit = 50) {
        const result = await query(
            `SELECT a.*, l.name as lead_name 
       FROM activities a
       LEFT JOIN leads l ON a.lead_id = l.id
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC 
       LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    static async findByLeadId(leadId) {
        const result = await query(
            `SELECT a.*, u.name as user_name 
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = $1 
       ORDER BY a.created_at DESC`,
            [leadId]
        );
        return result.rows;
    }

    static async getRecent(clinicId, limit = 20) {
        const result = await query(
            `SELECT a.*, u.name as user_name, l.name as lead_name 
       FROM activities a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN leads l ON a.lead_id = l.id
       WHERE u.clinic_id = $1 
       ORDER BY a.created_at DESC 
       LIMIT $2`,
            [clinicId, limit]
        );
        return result.rows;
    }
}

module.exports = Activity;