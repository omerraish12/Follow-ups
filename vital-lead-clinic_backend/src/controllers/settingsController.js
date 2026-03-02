const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const User = require('../models/User');

const TWILIO_SANDBOX_URL = process.env.TWILIO_SANDBOX_URL || 'https://www.twilio.com/console/sms/whatsapp/sandbox';
const TWILIO_SANDBOX_JOIN_CODE = process.env.TWILIO_SANDBOX_JOIN_CODE || 'join wood-silent';
const TWILIO_SANDBOX_NUMBER =
    process.env.TWILIO_SANDBOX_NUMBER || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const mergeWhatsappDefaults = (whatsapp = {}) => {
    return {
        ...{
            status: 'disconnected',
            sandbox: {
                joinCode: TWILIO_SANDBOX_JOIN_CODE,
                number: TWILIO_SANDBOX_NUMBER,
                link: TWILIO_SANDBOX_URL,
                lastJoinedAt: null
            }
        },
        ...whatsapp,
        sandbox: {
            ...{
                joinCode: TWILIO_SANDBOX_JOIN_CODE,
                number: TWILIO_SANDBOX_NUMBER,
                link: TWILIO_SANDBOX_URL,
                lastJoinedAt: null
            },
            ...(whatsapp.sandbox || {})
        }
    };
};

const mergeIntegrationDefaults = (incoming = {}) => {
    const defaults = {
        email: { status: 'connected' },
        calendar: { status: 'connected' },
        payment: { status: 'disconnected' }
    };
    return {
        ...defaults,
        ...incoming,
        whatsapp: mergeWhatsappDefaults(incoming.whatsapp)
    };
};

const defaultBackupSettings = {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    lastBackup: null,
    lastBackupFile: null
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

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

const collectClinicData = async (clinicId) => {
    const [clinicResult, usersResult, leadsResult, automationsResult, notificationsResult] = await Promise.all([
        query(
            `SELECT id, name, email, phone, address, timezone, language, currency, logo
             FROM clinics
             WHERE id = $1`,
            [clinicId]
        ),
        query(
            `SELECT id, name, email, phone, role, status, created_at
             FROM users
             WHERE clinic_id = $1
             ORDER BY created_at DESC`,
            [clinicId]
        ),
        query(
            `SELECT id, name, phone, email, service, status, source, value, notes,
                    last_contacted, next_follow_up, created_at, updated_at, assigned_to_id
             FROM leads
             WHERE clinic_id = $1
             ORDER BY created_at DESC`,
            [clinicId]
        ),
        query(
            `SELECT id, name, trigger_days, message, target_status, active, notify_on_reply,
                    last_executed, total_executions, reply_count, success_rate, created_at
             FROM automations
             WHERE clinic_id = $1
             ORDER BY id DESC`,
            [clinicId]
        ),
        query(
            `SELECT id, type, title, message, priority, action_label, action_link, metadata,
                    read, created_at
             FROM notifications
             WHERE clinic_id = $1
             ORDER BY created_at DESC
             LIMIT 500`,
            [clinicId]
        )
    ]);

    return {
        clinic: clinicResult.rows[0] || {},
        users: usersResult.rows || [],
        leads: leadsResult.rows || [],
        automations: automationsResult.rows || [],
        notifications: notificationsResult.rows || []
    };
};

const ensureBackupDirectory = async () => {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
};

const leadsToCsv = (leads) => {
    if (!leads?.length) return 'No leads available';
    const headers = Object.keys(leads[0]);
    const escape = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value).replace(/\"/g, '""');
        return `"${str}"`;
    };
    const rows = leads.map((lead) => headers.map((h) => escape(lead[h])).join(','));
    return [headers.join(','), ...rows].join('\n');
};

const buildPdfBuffer = (data) => new Promise((resolve, reject) => {
    try {
        const doc = new PDFDocument({ margin: 28, size: 'A4' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(18).text('Clinic Export', { underline: true });
        doc.moveDown();
        doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown(1.5);

        doc.fontSize(14).text('Clinic Details');
        doc.moveDown(0.5);
        Object.entries(data.clinic || {}).forEach(([key, value]) => {
            doc.fontSize(11).text(`${key}: ${value ?? ''}`);
        });

        const renderList = (title, items, mapper) => {
            doc.addPage();
            doc.fontSize(14).text(title);
            doc.moveDown(0.75);
            if (!items?.length) {
                doc.fontSize(11).text('No records');
                return;
            }
            items.forEach((item, idx) => {
                mapper(item, idx);
                doc.moveDown(0.5);
            });
        };

        renderList('Team', data.users, (user) => {
            doc.fontSize(11).text(`${user.name} <${user.email}>`);
            doc.fontSize(10).fillColor('#666').text(`Role: ${user.role} • Status: ${user.status} • Joined: ${new Date(user.created_at).toLocaleDateString()}`);
            doc.fillColor('black');
        });

        renderList('Leads', data.leads, (lead) => {
            doc.fontSize(11).text(`${lead.name} (${lead.phone || 'n/a'})`);
            doc.fontSize(10).fillColor('#666').text(`Status: ${lead.status} • Source: ${lead.source || 'n/a'} • Value: ${lead.value || 0}`);
            doc.fillColor('#444').text(lead.notes || '', { width: 480 });
            doc.fillColor('black');
        });

        renderList('Automations', data.automations, (automation) => {
            doc.fontSize(11).text(automation.name);
            doc.fontSize(10).fillColor('#666').text(`Target: ${automation.target_status || '—'} • Active: ${automation.active ? 'Yes' : 'No'} • Trigger days: ${automation.trigger_days?.join(', ') || '—'}`);
            doc.fillColor('#444').text(automation.message || '', { width: 480 });
            doc.fillColor('black');
        });

        renderList('Notifications (last 500)', data.notifications, (note) => {
            doc.fontSize(11).text(`${note.title} (${note.priority})`);
            doc.fontSize(10).fillColor('#666').text(`${note.type} • Read: ${note.read ? 'yes' : 'no'} • ${new Date(note.created_at).toLocaleString()}`);
            doc.fillColor('#444').text(note.message || '', { width: 480 });
            doc.fillColor('black');
        });

        doc.end();
    } catch (err) {
        reject(err);
    }
});

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
            `SELECT id, name, email, phone, role, avatar, created_at, notification_settings
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );
        const profile = userResult.rows[0] || {};

        const integrations = mergeIntegrationDefaults(clinic.integration_settings || {});
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
                avatar: profile.avatar || null,
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
        const incoming = req.body || {};
        const clinicResult = await query(
            `SELECT backup_settings FROM clinics WHERE id = $1`,
            [req.user.clinic_id]
        );
        const current = clinicResult.rows[0]?.backup_settings || defaultBackupSettings;
        const settings = {
            ...defaultBackupSettings,
            ...current,
            ...incoming
        };
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
        const data = await collectClinicData(req.user.clinic_id);

        await ensureBackupDirectory();
        const filename = `clinic-${req.user.clinic_id}-backup-${now.replace(/[:.]/g, '-')}.json`;
        const filepath = path.join(BACKUP_DIR, filename);
        await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');

        const clinicResult = await query(
            `SELECT backup_settings FROM clinics WHERE id = $1`,
            [req.user.clinic_id]
        );
        const current = clinicResult.rows[0]?.backup_settings || defaultBackupSettings;
        const next = { ...current, lastBackup: now, lastBackupFile: filename };

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
        const { type, status, data } = req.body;
        if (!type || !status) {
            return res.status(400).json({ message: 'Type and status are required' });
        }

        const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};

        const clinicResult = await query(
            `SELECT integration_settings FROM clinics WHERE id = $1`,
            [req.user.clinic_id]
        );
        const current = mergeIntegrationDefaults(clinicResult.rows[0]?.integration_settings || {});
        const currentTypeSettings = current?.[type] || {};
        const next = {
            ...current,
            [type]: {
                ...currentTypeSettings,
                ...safeData,
                status,
                updatedAt: new Date().toISOString()
            }
        };

        const result = await query(
            `UPDATE clinics
             SET integration_settings = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING integration_settings`,
            [next, req.user.clinic_id]
        );

        const savedIntegrations = result.rows[0]?.integration_settings || next;
        res.json(mergeIntegrationDefaults(savedIntegrations));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const exportData = async (req, res) => {
    try {
        const format = (req.body?.format || 'json').toString().toLowerCase();
        const data = await collectClinicData(req.user.clinic_id);

        if (format === 'json') {
            const buffer = Buffer.from(JSON.stringify(data, null, 2));
            const filename = `clinic-export-${Date.now()}.json`;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
            return res.send(buffer);
        }

        if (format === 'csv') {
            const csv = leadsToCsv(data.leads);
            const filename = `leads-export-${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
            return res.send(csv);
        }

        if (format === 'pdf') {
            const pdfBuffer = await buildPdfBuffer(data);
            const filename = `clinic-export-${Date.now()}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
            return res.send(pdfBuffer);
        }

        return res.status(400).json({ message: 'Unsupported export format' });
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

const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // In a real system you'd upload to S3/Cloudinary; here we save a data URL for simplicity
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'image/png';
        const dataUrl = `data:${mime};base64,${base64}`;

        await query(
            `UPDATE clinics SET logo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [dataUrl, req.user.clinic_id]
        );

        res.json({ logo: dataUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'image/png';
        const dataUrl = `data:${mime};base64,${base64}`;

        await query(
            `UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [dataUrl, req.user.id]
        );

        res.json({ avatar: dataUrl });
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
    deleteAccount,
    uploadLogo,
    uploadProfilePhoto
};
