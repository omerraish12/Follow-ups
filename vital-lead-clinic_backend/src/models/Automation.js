const { query } = require('../config/database');

const DEFAULT_AUTOMATIONS = Object.freeze([
    {
        name: '3-Day Follow-up',
        templateName: 'follow_up_3_days',
        triggerDays: [3],
        message: 'Hi {name}, just checking in about {service}. We saved you a slot this week - reply here and we will book it for you.',
        targetStatus: 'NEW',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: '7-Day Reminder',
        templateName: 'follow_up_1_week',
        triggerDays: [7],
        message: 'Hi {name}, following up on your interest in {service}. We have openings next week - want us to reserve one?',
        targetStatus: 'NEW',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: '14-Day Win-back',
        templateName: 'lost_client_special_offer',
        triggerDays: [14],
        message: "Hi {name}, it's been a while. We're offering a follow-up on {service} this week. Reply YES and we'll schedule you.",
        targetStatus: 'LOST',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: 'Post-Treatment Check-in',
        templateName: 'post_treatment_check_in',
        triggerDays: [2],
        message: "Hi {name}, how are you feeling after your {service}? Let us know if you have questions - we're here to help.",
        targetStatus: 'CLOSED',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: 'No-Reply Nudge',
        templateName: 'no_reply_nudge',
        triggerDays: [5],
        message: "Hi {name}, we didn't hear back about {service}. Want to pick a time? Reply with a day that works for you.",
        targetStatus: 'NEW',
        notifyOnReply: true,
        personalization: ['name', 'service']
    },
    {
        name: '3-Week Follow-up',
        triggerDays: [21],
        message: 'Hi {name}, it has been 3 weeks since your visit at our clinic. We wanted to check in - how are you feeling? Reply to this message if you have any questions!',
        templateName: 'three_week_followup',
        templateLanguage: 'en',
        notifyOnReply: true,
        personalization: ['name'],
        components: [
            { type: 'quick_reply', title: 'I feel great!', payload: 'feeling_great' },
            { type: 'quick_reply', title: 'Need a call', payload: 'need_call' }
        ],
        template_status: 'approved'
    }
]);

const normalizeComponents = (components) => {
    if (Array.isArray(components)) {
        return components;
    }
    if (!components) {
        return [];
    }
    if (typeof components === 'string') {
        try {
            const parsed = JSON.parse(components);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const formatAutomationRow = (row) => {
    if (!row) {
        return null;
    }
    return {
        ...row,
        components: normalizeComponents(row.components),
        template_status: row.template_status || 'pending'
    };
};

class Automation {
    static async findAll(clinicId) {
        const result = await query(
            `SELECT * FROM automations WHERE clinic_id = $1 ORDER BY created_at DESC`,
            [clinicId]
        );
        return result.rows.map(formatAutomationRow);
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
        const {
            name,
            triggerDays,
            message,
            targetStatus,
            notifyOnReply,
            personalization,
            templateName,
            templateLanguage,
            mediaUrl,
            components,
            templateStatus,
            templateSid,
            templateApprovalSid,
            clinicId,
            dailyCap,
            cooldownHours
        } = automationData;

        const normalizedComponents = normalizeComponents(components);
        const componentsPayload = normalizedComponents.length ? JSON.stringify(normalizedComponents) : '[]';
        const result = await query(
            `INSERT INTO automations 
            (name, trigger_days, message, template_name, template_language, media_url, components, target_status, notify_on_reply, personalization, clinic_id, template_status, template_sid, template_approval_sid, daily_cap, cooldown_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING *`,
            [
                name,
                triggerDays,
                message,
                templateName,
                templateLanguage || 'en',
                mediaUrl,
                componentsPayload,
                targetStatus,
                notifyOnReply,
                personalization,
                clinicId,
                templateStatus || 'pending',
                templateSid || null,
                templateApprovalSid || null,
                automationData.dailyCap || null,
                automationData.cooldownHours || null
            ]
        );
        return formatAutomationRow(result.rows[0]);
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
                if (key === 'templateName') dbKey = 'template_name';
                if (key === 'templateLanguage') dbKey = 'template_language';
                if (key === 'mediaUrl') dbKey = 'media_url';
                if (key === 'components') dbKey = 'components';
                if (key === 'templateStatus') dbKey = 'template_status';
                if (key === 'templateSid') dbKey = 'template_sid';
                if (key === 'templateApprovalSid') dbKey = 'template_approval_sid';

                let normalizedValue = value;
                if (key === 'components') {
                    const normalizedComponents = normalizeComponents(value);
                    normalizedValue = normalizedComponents.length ? JSON.stringify(normalizedComponents) : '[]';
                }

                fields.push(`${dbKey} = $${paramIndex}`);
                values.push(normalizedValue);
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
        return formatAutomationRow(result.rows[0]);
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

    static async updateTemplateMetadata(id, clinicId, metadata = {}) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const mapping = {
            templateStatus: 'template_status',
            templateSid: 'template_sid',
            templateApprovalSid: 'template_approval_sid',
            dailyCap: 'daily_cap',
            cooldownHours: 'cooldown_hours',
            mediaUrl: 'media_url'
        };

        for (const [key, value] of Object.entries(metadata)) {
            if (value === undefined) continue;
            const dbKey = mapping[key];
            if (!dbKey) continue;
            fields.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }

        if (!fields.length) {
            return null;
        }

        values.push(id, clinicId);
        const result = await query(
            `UPDATE automations 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} AND clinic_id = $${paramIndex + 1} RETURNING *`,
            values
        );

        return formatAutomationRow(result.rows[0]);
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

    static async incrementReplyCount(id) {
        await query(
            `UPDATE automations 
        SET reply_count = COALESCE(reply_count, 0) + 1
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
