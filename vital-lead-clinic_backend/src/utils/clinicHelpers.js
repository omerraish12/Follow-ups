const { query } = require('../config/database');

const DEFAULT_CLINIC_NAME = process.env.DEFAULT_CLINIC_NAME || 'Demo Clinic';
const DEFAULT_CLINIC_EMAIL = process.env.DEFAULT_CLINIC_EMAIL || process.env.EMAIL_USER || 'hello@clinicgrowth.com';
const DEFAULT_CLINIC_PHONE = process.env.DEFAULT_CLINIC_PHONE || null;

async function ensureClinicRecord() {
    if (process.env.DEFAULT_CLINIC_ID) {
        const overrideId = Number(process.env.DEFAULT_CLINIC_ID);
        if (!Number.isNaN(overrideId)) {
            const res = await query('SELECT * FROM clinics WHERE id = $1 LIMIT 1', [overrideId]);
            if (res.rows[0]) {
                return res.rows[0];
            }
        }
    }

    const existing = await query('SELECT * FROM clinics ORDER BY id LIMIT 1');
    if (existing.rows[0]) {
        return existing.rows[0];
    }

    const created = await query(
        'INSERT INTO clinics (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
        [DEFAULT_CLINIC_NAME, DEFAULT_CLINIC_EMAIL, DEFAULT_CLINIC_PHONE]
    );
    return created.rows[0];
}

async function getClinicAdminId(clinicId) {
    const override = process.env.DEFAULT_CLINIC_ADMIN_ID;
    if (override) {
        const parsed = Number(override);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    const adminResult = await query(
        `SELECT id FROM users WHERE clinic_id = $1 AND role = 'ADMIN' ORDER BY id LIMIT 1`,
        [clinicId]
    );
    if (adminResult.rows[0]) {
        return adminResult.rows[0].id;
    }

    const fallback = await query(
        `SELECT id FROM users WHERE clinic_id = $1 ORDER BY id LIMIT 1`,
        [clinicId]
    );
    return fallback.rows[0]?.id || null;
}

module.exports = {
    ensureClinicRecord,
    getClinicAdminId
};
