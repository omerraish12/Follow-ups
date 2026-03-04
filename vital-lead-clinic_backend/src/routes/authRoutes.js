const express = require('express');
const { body } = require('express-validator');
const {
    signup,
    login,
    forgotPassword,
    resetPassword,
    getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
    '/signup',
    [
        body('email')
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail({
                all_lowercase: false,
                gmail_remove_dots: false,
                gmail_remove_subaddress: false,
                gmail_convert_googlemaildotcom: false
            }),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('name')
            .notEmpty()
            .withMessage('Name is required')
    ],
    signup
);

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
