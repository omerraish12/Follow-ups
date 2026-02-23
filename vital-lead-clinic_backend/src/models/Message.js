const { query } = require('../config/database');

class Message {
    static async findByLeadId(leadId) {
        const result = await query(
            `SELECT * FROM messages WHERE lead_id = $1 ORDER BY timestamp ASC`,
            [leadId]
        );
        return result.rows;
    }

    static async create(messageData) {
        const { content, type, isBusiness, leadId } = messageData;
        const result = await query(
            `INSERT INTO messages (content, type, is_business, lead_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [content, type, isBusiness || false, leadId]
        );
        return result.rows[0];
    }

    static async getLastMessage(leadId) {
        const result = await query(
            `SELECT * FROM messages 
       WHERE lead_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
            [leadId]
        );
        return result.rows[0];
    }

    static async countByLeadId(leadId) {
        const result = await query(
            `SELECT COUNT(*) FROM messages WHERE lead_id = $1`,
            [leadId]
        );
        return parseInt(result.rows[0].count);
    }

    static async getBusinessMessageCount(leadId) {
        const result = await query(
            `SELECT COUNT(*) FROM messages 
       WHERE lead_id = $1 AND is_business = true`,
            [leadId]
        );
        return parseInt(result.rows[0].count);
    }
}

module.exports = Message;