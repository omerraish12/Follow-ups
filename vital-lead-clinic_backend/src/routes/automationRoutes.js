const express = require('express');
const {
    getAutomations,
    seedDefaultAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    resubmitTemplateApproval,
    approveTemplate,
    getPerformanceStats,
    getRecentReplies,
    getAutomationTemplates,
    refreshTemplateStatus,
    getDeliveryStats
} = require('../controllers/automationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/templates', getAutomationTemplates);
router.post('/:id/refresh-template-status', refreshTemplateStatus);

router.get('/', getAutomations);
router.get('/stats/performance', getPerformanceStats);
router.get('/stats/delivery', getDeliveryStats);
router.get('/replies/recent', getRecentReplies);
router.post('/defaults', seedDefaultAutomations);
router.get('/:id', getAutomation);
router.post('/', createAutomation);
router.put('/:id', updateAutomation);
router.patch('/:id/toggle', toggleAutomation);
router.post('/:id/resubmit-template', resubmitTemplateApproval);
router.post('/:id/approve-template', approveTemplate);
router.delete('/:id', deleteAutomation);

module.exports = router;
