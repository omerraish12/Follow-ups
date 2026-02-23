const { query } = require('../config/database');

class Execution {
    static async create(executionData) {
        const { automationId, leadId, message } = executionData;
        const result = await query(
            `INSERT INTO executions (automation_id, lead_id, message) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [automationId, leadId, message]
        );
        return result.rows[0];
    }

    static async findByAutomationId(automationId, limit = 10) {
        const result = await query(
            `SELECT e.*, l.name as lead_name 
       FROM executions e
       JOIN leads l ON e.lead_id = l.id
       WHERE e.automation_id = $1 
       ORDER BY e.executed_at DESC 
       LIMIT $2`,
            [automationId, limit]
        );
        return result.rows;
    }

    static async markReplied(executionId) {
        const result = await query(
            `UPDATE executions 
       SET replied = true, replied_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
            [executionId]
        );
        return result.rows[0];
    }

    static async getStats(automationId) {
        const result = await query(
            `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN replied THEN 1 END) as replies
       FROM executions 
       WHERE automation_id = $1`,
            [automationId]
        );
        return result.rows[0];
    }
}

module.exports = Execution;