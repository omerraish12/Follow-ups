const Automation = require('../models/Automation');
const Execution = require('../models/Execution');
const Notification = require('../models/Notification');

// @desc    Get all automations for clinic
// @route   GET /api/automations
const getAutomations = async (req, res) => {
    try {
        const automations = await Automation.findAll(req.user.clinic_id);
        res.json(automations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Seed default automations for clinic
// @route   POST /api/automations/defaults
const seedDefaultAutomations = async (req, res) => {
    try {
        const created = await Automation.seedDefaults(req.user.clinic_id);

        if (created.length > 0) {
            await Notification.create({
                type: 'system',
                title: 'Default automations added',
                message: `${created.length} default automation rules were added to your clinic.`,
                priority: 'low',
                actionLabel: 'View automations',
                actionLink: '/automations',
                metadata: { createdCount: created.length },
                userId: req.user.id,
                clinicId: req.user.clinic_id
            });
        }

        res.status(created.length > 0 ? 201 : 200).json({
            created,
            createdCount: created.length,
            message: created.length > 0
                ? 'Default automations created successfully'
                : 'Default automations already configured'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single automation
// @route   GET /api/automations/:id
const getAutomation = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);

        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        // Get recent executions
        const executions = await Execution.findByAutomationId(automation.id, 10);

        res.json({
            ...automation,
            executions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create automation
// @route   POST /api/automations
const createAutomation = async (req, res) => {
    try {
        const {
            name,
            triggerDays,
            message,
            targetStatus,
            notifyOnReply,
            personalization,
            templateName,
            templateLanguage,
            mediaUrl,
            components
        } = req.body;

        const automation = await Automation.create({
            name,
            triggerDays: triggerDays || [3, 7, 14],
            message,
            templateName,
            templateLanguage,
            mediaUrl,
            components,
            targetStatus,
            notifyOnReply: notifyOnReply !== undefined ? notifyOnReply : true,
            personalization: personalization || ['name'],
            clinicId: req.user.clinic_id
        });

        await Notification.create({
            type: 'system',
            title: 'Automation created',
            message: `Automation "${automation.name}" was created.`,
            priority: 'low',
            actionLabel: 'View automations',
            actionLink: '/automations',
            metadata: { automationId: automation.id, automationName: automation.name },
            userId: null,
            clinicId: req.user.clinic_id
        });

        res.status(201).json(automation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update automation
// @route   PUT /api/automations/:id
const updateAutomation = async (req, res) => {
    try {
        const {
            name,
            triggerDays,
            message,
            targetStatus,
            active,
            notifyOnReply,
            personalization,
            templateName,
            templateLanguage,
            mediaUrl,
            components
        } = req.body;

        const automation = await Automation.findById(req.params.id, req.user.clinic_id);

        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        const updated = await Automation.update(req.params.id, req.user.clinic_id, {
            name,
            triggerDays,
            message,
            targetStatus,
            active,
            notifyOnReply,
            personalization,
            templateName,
            templateLanguage,
            mediaUrl,
            components
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete automation
// @route   DELETE /api/automations/:id
const deleteAutomation = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);

        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        await Automation.delete(req.params.id, req.user.clinic_id);

        res.json({ message: 'Automation deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle automation active status
// @route   PATCH /api/automations/:id/toggle
const toggleAutomation = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);

        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        const updated = await Automation.toggleActive(req.params.id, req.user.clinic_id);

        await Notification.create({
            type: updated.active ? 'success' : 'alert',
            title: updated.active ? 'Automation enabled' : 'Automation disabled',
            message: `Automation "${updated.name}" was ${updated.active ? 'enabled' : 'disabled'}.`,
            priority: updated.active ? 'low' : 'medium',
            actionLabel: 'View automations',
            actionLink: '/automations',
            metadata: { automationId: updated.id, automationName: updated.name },
            userId: null,
            clinicId: req.user.clinic_id
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get automation performance stats
// @route   GET /api/automations/stats/performance
const getPerformanceStats = async (req, res) => {
    try {
        const stats = await Automation.getPerformanceStats(req.user.clinic_id);
        const totals = await Automation.getTotals(req.user.clinic_id);

    res.json({ stats, totals });
  } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recent automation replies
// @route   GET /api/automations/replies/recent
const getRecentReplies = async (req, res) => {
    try {
        const replies = await Execution.findRecentReplies(req.user.clinic_id, 6);
        res.json(replies);
    } catch (error) {
        console.error('Error fetching recent replies:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAutomations,
    seedDefaultAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getPerformanceStats,
    getRecentReplies
};
