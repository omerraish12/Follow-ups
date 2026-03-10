const { query } = require('../config/database');

const normalizeMessageFilters = (options = {}) => {
    const trimmedSearch = typeof options.search === 'string' ? options.search.trim() : '';
    const normalizedDirection = typeof options.direction === 'string' ? options.direction.trim().toUpperCase() : '';
    const normalizedStatus = typeof options.status === 'string' ? options.status.trim().toLowerCase() : '';
    const normalizedOrigin = typeof options.origin === 'string' ? options.origin.trim().toLowerCase() : '';
    const normalizedDateFrom = options.dateFrom ? new Date(options.dateFrom) : null;
    const normalizedDateTo = options.dateTo ? new Date(options.dateTo) : null;

    if (normalizedDateTo && !Number.isNaN(normalizedDateTo.getTime())) {
        normalizedDateTo.setHours(23, 59, 59, 999);
    }

    return {
        search: trimmedSearch || null,
        direction: ['SENT', 'RECEIVED'].includes(normalizedDirection) ? normalizedDirection : null,
        status: normalizedStatus || null,
        origin: normalizedOrigin || null,
        dateFrom: normalizedDateFrom && !Number.isNaN(normalizedDateFrom.getTime())
            ? normalizedDateFrom.toISOString()
            : null,
        dateTo: normalizedDateTo && !Number.isNaN(normalizedDateTo.getTime())
            ? normalizedDateTo.toISOString()
            : null
    };
};

const buildLeadMessageWhereClause = (leadId, options = {}) => {
    const filters = normalizeMessageFilters(options);
    const values = [leadId];
    const clauses = ['lead_id = $1'];

    if (filters.search) {
        values.push(`%${filters.search}%`);
        const searchParam = `$${values.length}`;
        clauses.push(`(
            content ILIKE ${searchParam}
            OR COALESCE(metadata->>'templateName', '') ILIKE ${searchParam}
            OR COALESCE(metadata->>'mediaCaption', '') ILIKE ${searchParam}
            OR COALESCE(metadata->>'fileName', '') ILIKE ${searchParam}
        )`);
    }

    if (filters.direction) {
        values.push(filters.direction);
        clauses.push(`type = $${values.length}`);
    }

    if (filters.status) {
        values.push(filters.status);
        clauses.push(`LOWER(COALESCE(delivery_status, '')) = $${values.length}`);
    }

    if (filters.origin) {
        values.push(filters.origin);
        clauses.push(`LOWER(COALESCE(message_origin, '')) = $${values.length}`);
    }

    if (filters.dateFrom) {
        values.push(filters.dateFrom);
        clauses.push(`timestamp >= $${values.length}`);
    }

    if (filters.dateTo) {
        values.push(filters.dateTo);
        clauses.push(`timestamp <= $${values.length}`);
    }

    return {
        values,
        whereClause: `WHERE ${clauses.join(' AND ')}`
    };
};

const formatMessageRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        ...row,
        metadata: row.metadata || {}
    };
};

class Message {
    static async findById(id, leadId = null) {
        const values = [id];
        let whereClause = 'WHERE id = $1';

        if (leadId !== null && leadId !== undefined) {
            values.push(leadId);
            whereClause += ` AND lead_id = $2`;
        }

        const result = await query(
            `SELECT * FROM messages ${whereClause} LIMIT 1`,
            values
        );

        return formatMessageRow(result.rows[0]);
    }

    static async findByLeadId(leadId, options = {}) {
        const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 100);
        const before = options.before ? new Date(options.before) : null;
        const { values, whereClause: baseWhereClause } = buildLeadMessageWhereClause(leadId, options);
        let whereClause = baseWhereClause;

        if (before && !Number.isNaN(before.getTime())) {
            values.push(before.toISOString());
            whereClause += ` AND timestamp < $${values.length}`;
        }

        values.push(limit + 1);
        const result = await query(
            `SELECT *
             FROM messages
             ${whereClause}
             ORDER BY timestamp DESC, id DESC
             LIMIT $${values.length}`,
            values
        );

        const rows = result.rows.map(formatMessageRow);
        const hasMore = rows.length > limit;
        const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();
        const nextCursor = messages.length ? messages[0].timestamp : null;

        return {
            messages,
            pagination: {
                hasMore,
                nextCursor,
                limit
            }
        };
    }

    static async findChangedSince(leadId, since, options = {}) {
        const parsedSince = since ? new Date(since) : null;
        if (!parsedSince || Number.isNaN(parsedSince.getTime())) {
            return [];
        }

        const { values, whereClause } = buildLeadMessageWhereClause(leadId, options);
        values.push(parsedSince.toISOString());

        const result = await query(
            `SELECT *
             FROM messages
             ${whereClause}
               AND COALESCE(status_updated_at, timestamp) > $${values.length}
             ORDER BY timestamp ASC, id ASC`,
            values
        );

        return result.rows.map(formatMessageRow);
    }

    static async create(messageData) {
        const {
            content,
            type,
            isBusiness,
            leadId,
            providerMessageId = null,
            deliveryStatus = null,
            messageOrigin = null,
            deliveryError = null,
            metadata = {}
        } = messageData;

        const result = await query(
            `INSERT INTO messages (
                content,
                type,
                is_business,
                lead_id,
                provider_message_id,
                delivery_status,
                status_updated_at,
                message_origin,
                delivery_error,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)
            RETURNING *`,
            [
                content,
                type,
                isBusiness || false,
                leadId,
                providerMessageId,
                deliveryStatus,
                messageOrigin,
                deliveryError,
                metadata || {}
            ]
        );
        return formatMessageRow(result.rows[0]);
    }

    static async updateDeliveryById(id, updates = {}) {
        const existingResult = await query(
            `SELECT * FROM messages WHERE id = $1`,
            [id]
        );
        const existing = formatMessageRow(existingResult.rows[0]);
        if (!existing) {
            return null;
        }

        const fields = [];
        const values = [];
        let paramIndex = 1;

        const mapping = {
            providerMessageId: 'provider_message_id',
            deliveryStatus: 'delivery_status',
            messageOrigin: 'message_origin',
            deliveryError: 'delivery_error',
            metadata: 'metadata'
        };

        for (const [key, dbKey] of Object.entries(mapping)) {
            if (updates[key] === undefined) continue;
            fields.push(`${dbKey} = $${paramIndex}`);
            values.push(key === 'metadata'
                ? { ...(existing.metadata || {}), ...(updates.metadata || {}) }
                : updates[key]);
            paramIndex++;
        }

        fields.push(`status_updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await query(
            `UPDATE messages
             SET ${fields.join(', ')}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );

        return formatMessageRow(result.rows[0]);
    }

    static async updateDeliveryByProviderMessageId(providerMessageId, updates = {}) {
        if (!providerMessageId) {
            return null;
        }

        const existingResult = await query(
            `SELECT * FROM messages WHERE provider_message_id = $1`,
            [providerMessageId]
        );
        const existing = formatMessageRow(existingResult.rows[0]);
        if (!existing) {
            return null;
        }

        const fields = [];
        const values = [];
        let paramIndex = 1;

        const mapping = {
            deliveryStatus: 'delivery_status',
            deliveryError: 'delivery_error',
            metadata: 'metadata'
        };

        for (const [key, dbKey] of Object.entries(mapping)) {
            if (updates[key] === undefined) continue;
            fields.push(`${dbKey} = $${paramIndex}`);
            values.push(key === 'metadata'
                ? { ...(existing.metadata || {}), ...(updates.metadata || {}) }
                : updates[key]);
            paramIndex++;
        }

        if (!fields.length) {
            return null;
        }

        fields.push(`status_updated_at = CURRENT_TIMESTAMP`);
        values.push(providerMessageId);

        const result = await query(
            `UPDATE messages
             SET ${fields.join(', ')}
             WHERE provider_message_id = $${paramIndex}
             RETURNING *`,
            values
        );

        return formatMessageRow(result.rows[0]);
    }

    static async getLastMessage(leadId) {
        const result = await query(
            `SELECT * FROM messages
             WHERE lead_id = $1
             ORDER BY timestamp DESC, id DESC
             LIMIT 1`,
            [leadId]
        );
        return formatMessageRow(result.rows[0]);
    }

    static async countByLeadId(leadId, options = {}) {
        const { values, whereClause } = buildLeadMessageWhereClause(leadId, options);
        const result = await query(
            `SELECT COUNT(*) FROM messages ${whereClause}`,
            values
        );
        return parseInt(result.rows[0].count, 10);
    }

    static async getBusinessMessageCount(leadId) {
        const result = await query(
            `SELECT COUNT(*) FROM messages
             WHERE lead_id = $1 AND is_business = true`,
            [leadId]
        );
        return parseInt(result.rows[0].count, 10);
    }
}

module.exports = Message;
