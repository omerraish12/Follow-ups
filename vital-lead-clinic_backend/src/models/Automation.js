const { query } = require('../config/database');

const DEFAULT_AUTOMATIONS = Object.freeze([
    {
        name: '3-Day Follow-up',
        triggerDays: [3],
        message: 'Hi {name}, we wanted to check in about {service}. Reply here and we can help you book an appointment.',
        targetStatus: 'NEW',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: '7-Day Reminder',
        triggerDays: [7],
        message: 'Hi {name}, this is a friendly reminder about {service}. We still have appointments available this week.',
        targetStatus: 'NEW',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: '14-Day Win-back',
        triggerDays: [14],
        message: 'Hi {name}, we would love to welcome you back for {service}. Reply to this message and we will assist right away.',
        targetStatus: 'LOST',
        notifyOnReply: true,
        personalization: ['name', 'service']
    }
]);

class Automation {
    static async findAll(clinicId) {
        const result = await query(
            `SELECT * FROM automations WHERE clinic_id = $1 ORDER BY created_at DESC`,
            [clinicId]
        );
        return result.rows;
    }

    static async findById(id, clinicId) {
        const result = await query(
            `SELECT a.*, 
              (SELECT COUNT(*) FROM executions WHERE automation_id = a.id) as execution_count
       FROM automations a
       WHERE a.id = $1 AND a.clinic_id = $2`,
            [id, clinicId]
        );
        return result.rows[0];
    }

    static async create(automationData) {
        const { name, triggerDays, message, targetStatus, notifyOnReply, personalization, clinicId } = automationData;
        const result = await query(
            `INSERT INTO automations (name, trigger_days, message, target_status, notify_on_reply, personalization, clinic_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
            [name, triggerDays, message, targetStatus, notifyOnReply, personalization, clinicId]
        );
        return result.rows[0];
    }

    static getDefaultAutomationPayloads() {
        return DEFAULT_AUTOMATIONS.map((automation) => ({
            ...automation,
            triggerDays: [...automation.triggerDays],
            personalization: [...automation.personalization]
        }));
    }

    static async seedDefaults(clinicId) {
        const existingResult = await query(
            `SELECT LOWER(name) as name FROM automations WHERE clinic_id = $1`,
            [clinicId]
        );

        const existingNames = new Set(existingResult.rows.map((row) => row.name));
        const defaultsToCreate = this.getDefaultAutomationPayloads().filter(
            (automation) => !existingNames.has(automation.name.toLowerCase())
        );

        if (!defaultsToCreate.length) {
            return [];
        }

        const created = [];
        for (const automation of defaultsToCreate) {
            const inserted = await this.create({
                ...automation,
                clinicId
            });
            created.push(inserted);
        }

        return created;
    }

    static async update(id, clinicId, automationData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(automationData)) {
            if (value !== undefined) {
                let dbKey = key;
                if (key === 'triggerDays') dbKey = 'trigger_days';
                if (key === 'targetStatus') dbKey = 'target_status';
                if (key === 'notifyOnReply') dbKey = 'notify_on_reply';

                fields.push(`${dbKey} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id, clinicId);
        const result = await query(
            `UPDATE automations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} AND clinic_id = $${paramIndex + 1} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id, clinicId) {
        const result = await query(
            `DELETE FROM automations WHERE id = $1 AND clinic_id = $2 RETURNING id`,
            [id, clinicId]
        );
        return result.rows[0];
    }

    static async toggleActive(id, clinicId) {
        const result = await query(
            `UPDATE automations 
       SET active = NOT active, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND clinic_id = $2 
       RETURNING *`,
            [id, clinicId]
        );
        return result.rows[0];
    }

    static async getActiveAutomations() {
        const result = await query(
            `SELECT a.*, c.id as clinic_id 
       FROM automations a
       JOIN clinics c ON a.clinic_id = c.id
       WHERE a.active = true`
        );
        return result.rows;
    }

    static async incrementExecutions(id) {
        await query(
            `UPDATE automations 
       SET total_executions = total_executions + 1,
           last_executed = CURRENT_TIMESTAMP 
       WHERE id = $1`,
            [id]
        );
    }

    static async updateSuccessRate(id) {
        await query(
            `UPDATE automations 
       SET success_rate = (reply_count::float / NULLIF(total_executions, 0) * 100)
       WHERE id = $1`,
            [id]
        );
    }

    static async getPerformanceStats(clinicId) {
        const result = await query(
            `SELECT 
         id, name, total_executions, reply_count, success_rate, active
       FROM automations 
       WHERE clinic_id = $1`,
            [clinicId]
        );
        return result.rows;
    }

    static async getTotals(clinicId) {
        const result = await query(
            `SELECT 
         COALESCE(SUM(total_executions), 0) as total_executions,
         COALESCE(SUM(reply_count), 0) as total_replies,
         COUNT(CASE WHEN active THEN 1 END) as active_count
       FROM automations 
       WHERE clinic_id = $1`,
            [clinicId]
        );
        return result.rows[0];
    }
}

module.exports = Automation;
