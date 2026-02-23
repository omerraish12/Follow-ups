const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, phone, clinicName } = req.body;

        // Check if user exists
        const existingUser = await User.findByEmail(email);
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

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            phone,
            clinicId,
            role: 'ADMIN'
        });

        // Set OTP
        await User.setOTP(user.id, otp, otpExpires);

        // Send OTP email
        await emailService.sendOTP(email, otp, name);

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
        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if email verified
        if (!user.email_verified) {
            // Generate new OTP
            const otp = generateOTP();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

            await User.setOTP(user.id, otp, otpExpires);
            await emailService.sendOTP(email, otp, user.name);

            return res.status(401).json({
                message: 'Please verify your email first',
                requireVerification: true,
                email: user.email
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Log activity
        await query(
            `INSERT INTO activities (type, description, user_id) 
       VALUES ($1, $2, $3)`,
            ['USER_LOGIN', `User ${user.name} logged in`, user.id]
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                clinicId: user.clinic_id,
                clinicName: user.clinic_name
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp_code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        if (new Date(user.otp_expires) < new Date()) {
            return res.status(400).json({ message: 'OTP code expired' });
        }

        // Verify user
        await User.verifyOTP(user.id);

        // Generate token
        const token = generateToken(user.id);

        res.json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await User.setOTP(user.id, otp, otpExpires);
        await emailService.sendOTP(email, otp, user.name);

        res.json({ message: 'OTP resent successfully' });
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

        delete user.password;

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    signup,
    login,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
    getMe
};