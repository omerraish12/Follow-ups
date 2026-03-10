const { query } = require('../config/database');

const formatSession = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    qr_code: row.qr_code || null,
    auth_state_encrypted: row.auth_state_encrypted || null,
    device_jid: row.device_jid || null,
    last_error: row.last_error || null,
    last_connected_at: row.last_connected_at || null
  };
};

class WhatsAppSession {
  static async findByClinicId(clinicId) {
    const result = await query(
      `SELECT *
       FROM whatsapp_sessions
       WHERE clinic_id = $1
       LIMIT 1`,
      [clinicId]
    );

    return formatSession(result.rows[0]);
  }

  static async upsert(clinicId, payload = {}) {
    const session = await this.findByClinicId(clinicId);
    if (!session) {
      const result = await query(
        `INSERT INTO whatsapp_sessions (
          clinic_id,
          provider,
          status,
          auth_state_encrypted,
          qr_code,
          device_jid,
          last_connected_at,
          last_error
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          clinicId,
          payload.provider || 'wa_web',
          payload.status || 'disconnected',
          payload.authStateEncrypted || null,
          payload.qrCode || null,
          payload.deviceJid || null,
          payload.lastConnectedAt || null,
          payload.lastError || null
        ]
      );
      return formatSession(result.rows[0]);
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    const mapping = {
      provider: 'provider',
      status: 'status',
      authStateEncrypted: 'auth_state_encrypted',
      qrCode: 'qr_code',
      deviceJid: 'device_jid',
      lastConnectedAt: 'last_connected_at',
      lastError: 'last_error'
    };

    for (const [key, dbKey] of Object.entries(mapping)) {
      if (payload[key] === undefined) {
        continue;
      }
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(payload[key]);
      paramIndex++;
    }

    if (!fields.length) {
      return session;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(clinicId);

    const result = await query(
      `UPDATE whatsapp_sessions
       SET ${fields.join(', ')}
       WHERE clinic_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return formatSession(result.rows[0]);
  }

  static async clearForClinic(clinicId) {
    const result = await query(
      `UPDATE whatsapp_sessions
       SET status = 'disconnected',
           auth_state_encrypted = NULL,
           qr_code = NULL,
           device_jid = NULL,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE clinic_id = $1
       RETURNING *`,
      [clinicId]
    );

    return formatSession(result.rows[0]);
  }
}

module.exports = WhatsAppSession;
