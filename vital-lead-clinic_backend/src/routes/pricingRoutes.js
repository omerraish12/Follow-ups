const express = require('express');
const { getPlans } = require('../controllers/pricingController');

const router = express.Router();

router.get('/', getPlans);

module.exports = router;
