// src/models/User.js
const { query } = require('../config/database');

class User {
    static async findByEmail(email) {
        const result = await query(
            `SELECT u.*, c.name as clinic_name, c.email as clinic_email 
       FROM users u 
       LEFT JOIN clinics c ON u.clinic_id = c.id 
       WHERE u.email = $1`,
            [email]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await query(
            `SELECT u.*, c.name as clinic_name, c.email as clinic_email 
       FROM users u 
       LEFT JOIN clinics c ON u.clinic_id = c.id 
       WHERE u.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async create(userData) {
        const { email, password, name, phone, clinicId, role = 'STAFF' } = userData;
        const result = await query(
            `INSERT INTO users (email, password, name, phone, clinic_id, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, role, clinic_id`,
            [email, password, name, phone, clinicId, role]
        );
        return result.rows[0];
    }

    static async update(id, userData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(userData)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    static async setResetToken(userId, token, expires) {
        await query(
            `UPDATE users SET reset_token = $1, reset_token_exp = $2 WHERE id = $3`,
            [token, expires, userId]
        );
    }

    static async findByResetToken(token) {
        const result = await query(
            `SELECT * FROM users WHERE reset_token = $1 AND reset_token_exp > CURRENT_TIMESTAMP`,
            [token]
        );
        return result.rows[0];
    }

    static async updatePassword(userId, password) {
        await query(
            `UPDATE users SET password = $1, reset_token = NULL, reset_token_exp = NULL WHERE id = $2`,
            [password, userId]
        );
    }

    static async getClinicUsers(clinicId) {
        const result = await query(
            `SELECT id, name, email, phone, role, created_at 
       FROM users WHERE clinic_id = $1 ORDER BY created_at DESC`,
            [clinicId]
        );
        return result.rows;
    }
}

module.exports = User;