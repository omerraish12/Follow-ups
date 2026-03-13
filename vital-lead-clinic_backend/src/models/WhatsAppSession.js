const { supabaseAdmin } = require('../config/supabase');

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
    const { data, error } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return formatSession(data);
  }

  static async upsert(clinicId, payload = {}) {
    const session = await this.findByClinicId(clinicId);
    if (!session) {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_sessions')
        .insert({
          clinic_id: clinicId,
          provider: payload.provider || 'wa_web',
          status: payload.status || 'disconnected',
          auth_state_encrypted: payload.authStateEncrypted || null,
          qr_code: payload.qrCode || null,
          device_jid: payload.deviceJid || null,
          last_connected_at: payload.lastConnectedAt || null,
          last_error: payload.lastError || null
        })
        .select('*')
        .single();
      if (error) throw error;
      return formatSession(data);
    }

    const updates = {};
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
      if (payload[key] !== undefined) {
        updates[dbKey] = payload[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return session;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('whatsapp_sessions')
      .update(updates)
      .eq('clinic_id', clinicId)
      .select('*')
      .single();
    if (error) throw error;
    return formatSession(data);
  }

  static async clearForClinic(clinicId) {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        auth_state_encrypted: null,
        qr_code: null,
        device_jid: null,
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('clinic_id', clinicId)
      .select('*')
      .single();
    if (error) throw error;
    return formatSession(data);
  }
}

module.exports = WhatsAppSession;
