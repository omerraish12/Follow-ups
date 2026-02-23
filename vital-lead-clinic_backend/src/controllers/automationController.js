const Automation = require('../models/Automation');
const Execution = require('../models/Execution');

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
            personalization
        } = req.body;

        const automation = await Automation.create({
            name,
            triggerDays: triggerDays || [3, 7, 14],
            message,
            targetStatus,
            notifyOnReply: notifyOnReply !== undefined ? notifyOnReply : true,
            personalization: personalization || ['name'],
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
            personalization
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
            personalization
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

module.exports = {
    getAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getPerformanceStats
};