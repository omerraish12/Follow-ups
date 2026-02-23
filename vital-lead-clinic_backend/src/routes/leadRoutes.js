const express = require('express');
const { body } = require('express-validator');
const {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    addMessage,
    bulkUpdate,
    getFollowupNeeded
} = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getLeads);
router.get('/followup/needed', getFollowupNeeded);
router.get('/:id', getLead);

router.post(
    '/',
    [
        body('name').notEmpty(),
        body('phone').notEmpty()
    ],
    createLead
);

router.post('/bulk', bulkUpdate);
router.post('/:id/messages', addMessage);

router.put('/:id', updateLead);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteLead);

module.exports = router;