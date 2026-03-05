const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const User = require('../models/User');
const Automation = require('../models/Automation');
const emailService = require('../utils/emailService');

const buildUserPayload = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    clinicId: user.clinic_id,
    clinicName: user.clinic_name,
    entryType: user.entry_type || 'clinic',
});

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Register user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const details = errors.array();
            return res.status(400).json({
                message: details[0]?.msg || 'Invalid signup data',
                errors: details
            });
        }

        const { email, password, name, phone, clinicName } = req.body;
        const normalizedEmail = User.canonicalizeEmail(email);

        // Check if user exists
        const existingUser = await User.findByEmail(normalizedEmail);
        console.log("existingUser", existingUser);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create clinic
        const clinicResult = await query(
            `INSERT INTO clinics (name, email) VALUES ($1, $2) RETURNING id`,
            [clinicName || `${name}'s Clinic`, email]
        );
        const clinicId = clinicResult.rows[0].id;

        // Create user
        const user = await User.create({
            email: normalizedEmail,
            password: hashedPassword,
            name,
            phone,
            clinicId,
            role: 'ADMIN'
        });

        // Seed starter automations for new clinics
        try {
            await Automation.seedDefaults(clinicId);
        } catch (seedError) {
            console.error('Failed to seed default automations during signup:', seedError);
        }

        res.status(201).json({
            message: 'User created successfully. Please verify your email.',
            userId: user.id,
            email: user.email
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password, entryType = 'clinic', entryCode } = req.body;
        const normalizedEmail = User.canonicalizeEmail(email);

        // Find user
        const user = await User.findByEmail(normalizedEmail);
        console.log('User lookup result:', user);
        const allUsers = await User.findAll();
        console.log(`All users (${allUsers.length} records)`, allUsers);

        if (!user) {
            console.log(`Login attempt failed for ${normalizedEmail}: user not found`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`Login attempt failed for ${normalizedEmail}: password mismatch`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const requestedEntryType = entryType === 'patient' ? 'patient' : 'clinic';
        const configuredEntryType = user.entry_type || 'clinic';

        if (requestedEntryType !== configuredEntryType) {
            const label = configuredEntryType === 'patient' ? 'patient portal' : 'clinic portal';
            return res.status(403).json({
                message: `Please log in through the ${label}.`
            });
        }

        if (requestedEntryType === 'patient' && user.entry_code) {
            if (!entryCode) {
                return res.status(403).json({ message: 'Patient access code is required.' });
            }
            if (entryCode !== user.entry_code) {
                return res.status(403).json({ message: 'Invalid patient access code.' });
            }
        }

        // Generate token
        const token = generateToken(user.id);

        // Log activity
        await query(
            `INSERT INTO activities (type, description, user_id) 
       VALUES ($1, $2, $3)`,
            ['USER_LOGIN', `User ${user.name} logged in`, user.id]
        );

        if (user.status !== 'active') {
            await User.update(user.id, { status: 'active' });
        }

        const redirectPath = requestedEntryType === 'patient' ? '/patient/dashboard' : '/dashboard';

        const payload = {
            token,
            redirectPath,
            user: buildUserPayload(user)
        };

        console.log(`Login successful for ${email} (userId ${user.id}, entryType ${requestedEntryType})`);
        res.json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await User.setResetToken(user.id, resetToken, resetTokenExp);

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
        await emailService.sendPasswordReset(email, resetUrl, user.name);

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByResetToken(token);

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password
        await User.updatePassword(user.id, hashedPassword);
        await User.update(user.id, { status: 'active' });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(buildUserPayload(user));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    signup,
    login,
    forgotPassword,
    resetPassword,
    getMe
};
