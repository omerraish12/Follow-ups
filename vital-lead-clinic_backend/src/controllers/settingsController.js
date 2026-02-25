const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const User = require('../models/User');

const defaultIntegrationSettings = {
    whatsapp: { status: 'disconnected' },
    email: { status: 'connected' },
    calendar: { status: 'connected' },
    payment: { status: 'disconnected' }
};

const defaultBackupSettings = {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    lastBackup: null
};

const defaultNotificationSettings = {
    emailNotifications: true,
    pushNotifications: true,
    leadAlerts: true,
    automationAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    marketingEmails: false
};

const getSettings = async (req, res) => {
    try {
        const clinicResult = await query(
            `SELECT id, name, email, phone, address, timezone, language, currency, logo,
                    integration_settings, backup_settings
             FROM clinics
             WHERE id = $1`,
            [req.user.clinic_id]
        );
        const clinic = clinicResult.rows[0] || {};

        const userResult = await query(
            `SELECT id, name, email, phone, role, created_at, notification_settings
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );
        const profile = userResult.rows[0] || {};

        const integrations = clinic.integration_settings || defaultIntegrationSettings;
        const backupSettings = clinic.backup_settings || defaultBackupSettings;
        const notificationSettings = profile.notification_settings || defaultNotificationSettings;

        res.json({
            clinic: {
                id: clinic.id,
                name: clinic.name,
                email: clinic.email,
                phone: clinic.phone,
                address: clinic.address,
                timezone: clinic.timezone,
                language: clinic.language,
                currency: clinic.currency,
                logo: clinic.logo || null
            },
            profile: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                role: profile.role,
                createdAt: profile.created_at
            },
            integrations,
            backupSettings,
            notificationSettings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateClinic = async (req, res) => {
    try {
        const { name, email, phone, address, timezone, language, currency, logo } = req.body;
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const setField = (field, value) => {
            if (value !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        };

        setField('name', name);
        setField('email', email);
        setField('phone', phone);
        setField('address', address);
        setField('timezone', timezone);
        setField('language', language);
        setField('currency', currency);
        setField('logo', logo);

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        values.push(req.user.clinic_id);
        const result = await query(
            `UPDATE clinics
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex}
             RETURNING id, name, email, phone, address, timezone, language, currency, logo`,
            values
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const updated = await User.update(req.user.id, { name, email, phone });
        if (updated?.password) {
            delete updated.password;
        }
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.updatePassword(user.id, hashedPassword);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateNotifications = async (req, res) => {
    try {
        const settings = req.body || {};
        const result = await query(
            `UPDATE users
             SET notification_settings = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING notification_settings`,
            [settings, req.user.id]
        );
        res.json(result.rows[0]?.notification_settings || settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateBackupSettings = async (req, res) => {
    try {
        const settings = req.body || {};
        const result = await query(
            `UPDATE clinics
             SET backup_settings = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING backup_settings`,
            [settings, req.user.clinic_id]
        );
        res.json(result.rows[0]?.backup_settings || settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const runBackup = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const clinicResult = await query(
            `SELECT backup_settings FROM clinics WHERE id = $1`,
            [req.user.clinic_id]
        );
        const current = clinicResult.rows[0]?.backup_settings || defaultBackupSettings;
        const next = { ...current, lastBackup: now };

        await query(
            `UPDATE clinics
             SET backup_settings = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [next, req.user.clinic_id]
        );

        res.json(next);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateIntegration = async (req, res) => {
    try {
        const { type, status } = req.body;
        if (!type || !status) {
            return res.status(400).json({ message: 'Type and status are required' });
        }

        const clinicResult = await query(
            `SELECT integration_settings FROM clinics WHERE id = $1`,
            [req.user.clinic_id]
        );
        const current = clinicResult.rows[0]?.integration_settings || defaultIntegrationSettings;
        const next = {
            ...current,
            [type]: { ...(current?.[type] || {}), status }
        };

        const result = await query(
            `UPDATE clinics
             SET integration_settings = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING integration_settings`,
            [next, req.user.clinic_id]
        );

        res.json(result.rows[0]?.integration_settings || next);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const exportData = async (req, res) => {
    try {
        res.json({ message: 'Export started' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';

        if (isAdmin) {
            const adminResult = await query(
                `SELECT COUNT(*)::int as count
                 FROM users
                 WHERE clinic_id = $1 AND role = 'ADMIN' AND id <> $2`,
                [req.user.clinic_id, req.user.id]
            );
            if ((adminResult.rows[0]?.count || 0) === 0) {
                return res.status(400).json({ message: 'At least one admin must remain in the clinic' });
            }
        }

        await query(
            `DELETE FROM users WHERE id = $1 AND clinic_id = $2`,
            [req.user.id, req.user.clinic_id]
        );

        res.json({ message: 'Account deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getSettings,
    updateClinic,
    updateProfile,
    changePassword,
    updateNotifications,
    updateBackupSettings,
    runBackup,
    updateIntegration,
    exportData,
    deleteAccount
};
