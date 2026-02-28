const express = require('express');
const { body } = require('express-validator');
const { handleContactForm } = require('../controllers/contactController');

const router = express.Router();

router.post(
    '/',
    [
        body('name').trim().notEmpty(),
        body('phone').trim().notEmpty(),
        body('message').trim().notEmpty(),
        body('email').optional({ checkFalsy: true }).isEmail(),
        body('agreement').isBoolean().withMessage('Agreement must be accepted')
    ],
    handleContactForm
);

module.exports = router;
