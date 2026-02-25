const express = require('express');
const {
    getMembers,
    createMember,
    updateMember,
    deleteMember,
    resetMemberPassword,
    getClinics
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/members', getMembers);
router.post('/members', authorize('ADMIN', 'MANAGER'), createMember);
router.put('/members/:id', authorize('ADMIN', 'MANAGER'), updateMember);
router.delete('/members/:id', authorize('ADMIN', 'MANAGER'), deleteMember);
router.post('/members/:id/reset-password', authorize('ADMIN', 'MANAGER'), resetMemberPassword);
router.get('/clinics', getClinics);

module.exports = router;
