const express = require('express');
const {
    getAutomations,
    seedDefaultAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getPerformanceStats,
    getRecentReplies
} = require('../controllers/automationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getAutomations);
router.get('/stats/performance', getPerformanceStats);
router.get('/replies/recent', getRecentReplies);
router.post('/defaults', seedDefaultAutomations);
router.get('/:id', getAutomation);
router.post('/', createAutomation);
router.put('/:id', updateAutomation);
router.patch('/:id/toggle', toggleAutomation);
router.delete('/:id', deleteAutomation);

module.exports = router;
