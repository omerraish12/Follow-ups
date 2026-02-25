const { query } = require('../config/database');

class Notification {
    static async findAll(clinicId, userId, limit = 50) {
        const result = await query(
            `SELECT * FROM notifications
             WHERE clinic_id = $1 AND (user_id = $2 OR user_id IS NULL)
             ORDER BY created_at DESC
             LIMIT $3`,
            [clinicId, userId, limit]
        );
        return result.rows;
    }

    static async create(notification) {
        const {
            type = 'system',
            title,
            message,
            priority = 'medium',
            actionLabel,
            actionLink,
            metadata,
            userId,
            clinicId
        } = notification;

        const result = await query(
            `INSERT INTO notifications
             (type, title, message, priority, action_label, action_link, metadata, user_id, clinic_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [type, title, message, priority, actionLabel, actionLink, metadata || null, userId, clinicId]
        );
        return result.rows[0];
    }

    static async markRead(id, clinicId, userId) {
        const result = await query(
            `UPDATE notifications
             SET read = true
             WHERE id = $1 AND clinic_id = $2 AND (user_id = $3 OR user_id IS NULL)
             RETURNING *`,
            [id, clinicId, userId]
        );
        return result.rows[0];
    }

    static async markAllRead(clinicId, userId) {
        const result = await query(
            `UPDATE notifications
             SET read = true
             WHERE clinic_id = $1 AND (user_id = $2 OR user_id IS NULL)
             RETURNING id`,
            [clinicId, userId]
        );
        return result.rows;
    }

    static async delete(id, clinicId, userId) {
        const result = await query(
            `DELETE FROM notifications
             WHERE id = $1 AND clinic_id = $2 AND (user_id = $3 OR user_id IS NULL)
             RETURNING id`,
            [id, clinicId, userId]
        );
        return result.rows[0];
    }

    static async clearAll(clinicId, userId) {
        const result = await query(
            `DELETE FROM notifications
             WHERE clinic_id = $1 AND (user_id = $2 OR user_id IS NULL)`,
            [clinicId, userId]
        );
        return { count: result.rowCount };
    }

    static async countUnread(clinicId, userId) {
        const result = await query(
            `SELECT COUNT(*)::int as count
             FROM notifications
             WHERE clinic_id = $1
               AND read = false
               AND (user_id = $2 OR user_id IS NULL)`,
            [clinicId, userId]
        );
        return result.rows[0]?.count || 0;
    }
}

module.exports = Notification;
