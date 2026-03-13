const { query } = require('../config/database');

const normalizePhoneInput = (value) => (value || '').replace(/[^0-9+]/g, '');

const generatePhoneVariants = (phone) => {
  const normalized = normalizePhoneInput(phone);
  if (!normalized) {
    return [];
  }

  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  const variants = new Set();
  variants.add(normalized);
  if (digitsOnly) {
    variants.add(digitsOnly);
    variants.add(digitsOnly.replace(/^0+/, ''));
  }

  const suffixLengths = [9, 10, 11];
  for (const length of suffixLengths) {
    if (digitsOnly.length >= length) {
      const suffix = digitsOnly.slice(-length);
      if (suffix) {
        variants.add(suffix);
        variants.add(`0${suffix}`);
      }
    }
  }

  return Array.from(variants).filter(Boolean);
};

class Lead {
    static async findAll(filters = {}) {
        let sql = `
      SELECT l.*, 
             u.name as assigned_to_name,
             (SELECT COUNT(*) FROM messages WHERE lead_id = l.id) as message_count,
             (SELECT content FROM messages WHERE lead_id = l.id ORDER BY timestamp DESC LIMIT 1) as last_message_content,
             (SELECT timestamp FROM messages WHERE lead_id = l.id ORDER BY timestamp DESC LIMIT 1) as last_message_at,
             (SELECT type FROM messages WHERE lead_id = l.id ORDER BY timestamp DESC LIMIT 1) as last_message_type,
             (SELECT is_business FROM messages WHERE lead_id = l.id ORDER BY timestamp DESC LIMIT 1) as last_message_is_business,
             (SELECT timestamp FROM messages WHERE lead_id = l.id AND type = 'RECEIVED' ORDER BY timestamp DESC LIMIT 1) as last_inbound_message_at
      FROM leads l
      LEFT JOIN users u ON l.assigned_to_id = u.id
      WHERE 1=1
    `;
        const values = [];
        let paramIndex = 1;

        if (filters.clinicId) {
            sql += ` AND l.clinic_id = $${paramIndex}::int`;
            values.push(filters.clinicId);
            paramIndex++;
        }

        if (filters.status && filters.status !== 'all') {
            sql += ` AND l.status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.source && filters.source !== 'all') {
            sql += ` AND l.source = $${paramIndex}`;
            values.push(filters.source);
            paramIndex++;
        }

        if (filters.assignedTo && filters.assignedTo !== 'all') {
            sql += ` AND l.assigned_to_id = $${paramIndex}`;
            values.push(filters.assignedTo);
            paramIndex++;
        }

        if (filters.search) {
            sql += ` AND (
        l.name ILIKE $${paramIndex} OR 
        l.phone ILIKE $${paramIndex} OR 
        l.email ILIKE $${paramIndex} OR 
        l.service ILIKE $${paramIndex}
      )`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY l.created_at DESC`;

        const result = await query(sql, values);
        return result.rows;
    }

    static async findById(id, clinicId) {
        const result = await query(
        `SELECT l.*, 
              u.name as assigned_to_name,
              u.email as assigned_to_email,
              (SELECT timestamp FROM messages WHERE lead_id = l.id AND type = 'RECEIVED' ORDER BY timestamp DESC LIMIT 1) as last_inbound_message_at
       FROM leads l
       LEFT JOIN users u ON l.assigned_to_id = u.id
       WHERE l.id = $1 AND l.clinic_id = $2::int`,
            [id, clinicId]
        );
        return result.rows[0];
    }

    static async create(leadData) {
    const {
        name,
        phone,
        email,
        service,
        status = 'NEW',
        source,
        value,
        notes,
        entryCode = null,
        nextFollowUp,
        assignedToId,
        lastVisitDate,
        followUpSent,
        clinicId
    } = leadData;
    const result = await query(
            `INSERT INTO leads (name, phone, email, service, status, source, value, notes, entry_code, next_follow_up, last_visit_date, follow_up_sent, consent_given, consent_timestamp, assigned_to_id, clinic_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING *`,
            [
                name,
                phone,
                email,
                service,
                status,
                source,
                value,
                notes,
                entryCode,
                nextFollowUp || null,
                lastVisitDate || null,
                followUpSent || false,
                true,
                new Date().toISOString(),
                assignedToId,
                clinicId
            ]
        );
        return result.rows[0];
    }

    static async findByPhone(phone, clinicId = null) {
        const variants = generatePhoneVariants(phone);
        if (!variants.length) {
            return null;
        }

        const values = [variants];
        const conditions = [
            "regexp_replace(phone, '[^0-9+]', '', 'g') = ANY($1)",
            "regexp_replace(phone, '[^0-9]', '', 'g') = ANY($1)"
        ];

        let clinicClause = '';
        if (clinicId) {
            clinicClause = ' AND clinic_id = $2::int';
            values.push(clinicId);
        }

        const result = await query(
            `SELECT * FROM leads 
             WHERE (${conditions.join(' OR ')})
             ${clinicClause}
             LIMIT 1`,
            values
        );
        return result.rows[0] || null;
    }

    static async update(id, clinicId, leadData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(leadData)) {
            if (value !== undefined) {
                if (key === 'consentGiven' || key === 'consentTimestamp') {
                    continue;
                }
                let dbKey = key;
                if (key === 'assignedToId') dbKey = 'assigned_to_id';
                if (key === 'lastContacted') dbKey = 'last_contacted';
                if (key === 'lastInboundMessageAt') dbKey = 'last_inbound_message_at';
                if (key === 'nextFollowUp') dbKey = 'next_follow_up';
                if (key === 'lastVisitDate') dbKey = 'last_visit_date';
                if (key === 'followUpSent') dbKey = 'follow_up_sent';
                if (key === 'entryCode') dbKey = 'entry_code';

                fields.push(`${dbKey} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id, clinicId);
        const result = await query(
            `UPDATE leads SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} AND clinic_id = $${paramIndex + 1}::int RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async delete(id, clinicId) {
        const result = await query(
            `DELETE FROM leads WHERE id = $1 AND clinic_id = $2::int RETURNING id`,
            [id, clinicId]
        );
        return result.rows[0];
    }

    static async updateLastContacted(id) {
        await query(
            `UPDATE leads SET last_contacted = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
    }

    static async getFollowupNeeded(clinicId) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const result = await query(
            `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to_id = u.id
       WHERE l.clinic_id = $1::int 
         AND l.status NOT IN ('CLOSED', 'LOST')
         AND l.last_contacted < $2::timestamptz
         AND EXISTS (
           SELECT 1 FROM messages m 
           WHERE m.lead_id = l.id AND m.type = 'RECEIVED'
         )`,
            [clinicId, threeDaysAgo]
        );
        return result.rows;
    }

    static async bulkUpdate(leadIds, clinicId, data) {
        const placeholders = leadIds.map((_, i) => `$${i + 1}`).join(',');
        const values = [...leadIds];

        let setClause = [];
        let paramIndex = leadIds.length + 1;

        for (const [key, value] of Object.entries(data)) {
            let dbKey = key;
            if (key === 'assignedToId') dbKey = 'assigned_to_id';
            setClause.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }

        values.push(clinicId);

        const result = await query(
            `UPDATE leads 
       SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND clinic_id = $${paramIndex}::int
       RETURNING id`,
            values
        );
        return result.rows;
    }

    static async getStats(clinicId, startDate) {
        const result = await query(
            `SELECT 
         COUNT(*) FILTER (WHERE created_at >= $2::timestamptz) as total,
         COUNT(*) FILTER (WHERE status = 'NEW' AND created_at >= $2::timestamptz) as new,
         COUNT(*) FILTER (WHERE status = 'HOT' AND updated_at >= $2::timestamptz) as hot,
         COUNT(*) FILTER (WHERE status = 'CLOSED' AND updated_at >= $2::timestamptz) as closed,
         COUNT(*) FILTER (WHERE status = 'LOST' AND updated_at >= $2::timestamptz) as lost,
         COALESCE(SUM(CASE WHEN status = 'CLOSED' AND updated_at >= $2::timestamptz THEN value ELSE 0 END), 0) as revenue
       FROM leads 
       WHERE clinic_id = $1::int`,
            [clinicId, startDate]
        );
        return result.rows[0];
    }

    static async getStatusDistribution(clinicId) {
       const result = await query(
            `SELECT status, COUNT(*) as count 
       FROM leads 
       WHERE clinic_id = $1::int 
       GROUP BY status`,
            [clinicId]
        );
        return result.rows;
    }

    static async getSourcePerformance(clinicId) {
       const result = await query(
            `SELECT 
         COALESCE(source, 'Other') as source,
         COUNT(*) as count,
         COALESCE(SUM(value), 0) as total_value,
         COALESCE(AVG(value), 0) as avg_value
       FROM leads 
       WHERE clinic_id = $1::int 
       GROUP BY source`,
            [clinicId]
        );
        return result.rows;
    }

    static async getWeeklyActivity(clinicId) {
       const result = await query(
            `SELECT 
         EXTRACT(DOW FROM created_at) as day_of_week,
         COUNT(*) as count
       FROM leads 
       WHERE clinic_id = $1::int 
         AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY EXTRACT(DOW FROM created_at)
       ORDER BY day_of_week`,
            [clinicId]
        );
        return result.rows;
    }
}

module.exports = Lead;
