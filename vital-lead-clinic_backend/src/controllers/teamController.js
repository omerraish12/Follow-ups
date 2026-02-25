const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const User = require('../models/User');
const emailService = require('../utils/emailService');

const normalizeRole = (role) => {
    if (!role) return 'STAFF';
    const upper = String(role).toUpperCase();
    if (upper === 'ADMIN' || upper === 'MANAGER' || upper === 'STAFF') {
        return upper;
    }
    return 'STAFF';
};

const normalizeStatus = (status) => {
    if (!status) return undefined;
    const lower = String(status).toLowerCase();
    if (['active', 'inactive', 'pending'].includes(lower)) {
        return lower;
    }
    return undefined;
};

// @desc    Get team members with performance stats
// @route   GET /api/team/members
const getMembers = async (req, res) => {
    try {
        const members = await User.getClinicUsersWithStats(req.user.clinic_id);
        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create team member (invite)
// @route   POST /api/team/members
const createMember = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const randomPassword = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            name,
            phone,
            clinicId: req.user.clinic_id,
            role: normalizeRole(role),
            status: 'pending'
        });

        // Create reset token to set password
        const resetToken = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });
        const resetTokenExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await User.setResetToken(newUser.id, resetToken, resetTokenExp);

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        try {
            await emailService.sendPasswordReset(email, resetUrl, name);
        } catch (emailError) {
            console.error('Error sending invite email:', emailError);
        }

        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update team member
// @route   PUT /api/team/members/:id
const updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, role, status } = req.body;

        const user = await User.findById(id);
        if (!user || user.clinic_id !== req.user.clinic_id) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = normalizeRole(role);
        const normalizedStatus = normalizeStatus(status);
        if (normalizedStatus !== undefined) updateData.status = normalizedStatus;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        const updated = await User.update(id, updateData);
        if (updated?.password) {
            delete updated.password;
        }
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete team member
// @route   DELETE /api/team/members/:id
const deleteMember = async (req, res) => {
    try {
        const { id } = req.params;

        if (String(id) === String(req.user.id)) {
            return res.status(400).json({ message: 'You cannot remove your own account' });
        }

        const result = await query(
            `DELETE FROM users WHERE id = $1 AND clinic_id = $2 RETURNING id`,
            [id, req.user.clinic_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ id: result.rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Send reset password link for member
// @route   POST /api/team/members/:id/reset-password
const resetMemberPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user || user.clinic_id !== req.user.clinic_id) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);
        await User.setResetToken(user.id, resetToken, resetTokenExp);

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
        await emailService.sendPasswordReset(user.email, resetUrl, user.name);

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get clinics (current clinic only)
// @route   GET /api/team/clinics
const getClinics = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                COALESCE(u.member_count, 0) as members,
                COALESCE(l.lead_count, 0) as leads,
                COALESCE(l.closed_count, 0) as closed
             FROM clinics c
             LEFT JOIN (
                SELECT clinic_id, COUNT(*) as member_count
                FROM users
                GROUP BY clinic_id
             ) u ON u.clinic_id = c.id
             LEFT JOIN (
                SELECT clinic_id,
                       COUNT(*) as lead_count,
                       SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
                FROM leads
                GROUP BY clinic_id
             ) l ON l.clinic_id = c.id
             WHERE c.id = $1`,
            [req.user.clinic_id]
        );

        const clinics = result.rows.map((row) => {
            const leads = parseInt(row.leads, 10) || 0;
            const closed = parseInt(row.closed, 10) || 0;
            const conversion = leads > 0 ? `${Math.round((closed / leads) * 100)}%` : '0%';
            return {
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                address: row.address,
                members: parseInt(row.members, 10) || 0,
                leads,
                conversion
            };
        });

        res.json(clinics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMembers,
    createMember,
    updateMember,
    deleteMember,
    resetMemberPassword,
    getClinics
};
