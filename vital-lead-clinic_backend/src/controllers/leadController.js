const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');

// @desc    Get all leads for clinic
// @route   GET /api/leads
const getLeads = async (req, res) => {
    try {
        const { status, search, source, assignedTo } = req.query;

        const filters = {
            clinicId: req.user.clinic_id,
            status,
            source,
            assignedTo,
            search
        };

        const leads = await Lead.findAll(filters);

        res.json(leads);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
const getLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Get messages
        const messages = await Message.findByLeadId(lead.id);

        // Get activities
        const activities = await Activity.findByLeadId(lead.id);

        res.json({
            ...lead,
            messages,
            activities
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create lead
// @route   POST /api/leads
const createLead = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, phone, email, service, source, value, notes, assignedToId } = req.body;

        const lead = await Lead.create({
            name,
            phone,
            email,
            service,
            source,
            value: parseFloat(value) || 0,
            notes,
            assignedToId,
            clinicId: req.user.clinic_id
        });

        // Log activity
        await Activity.create({
            type: 'LEAD_CREATED',
            description: `Lead ${name} created`,
            userId: req.user.id,
            leadId: lead.id
        });

        res.status(201).json(lead);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
const updateLead = async (req, res) => {
    try {
        const { name, phone, email, service, status, source, value, notes, assignedToId } = req.body;

        const existingLead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!existingLead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const lead = await Lead.update(req.params.id, req.user.clinic_id, {
            name,
            phone,
            email,
            service,
            status,
            source,
            value: value ? parseFloat(value) : undefined,
            notes,
            assignedToId
        });

        // Log status change
        if (status && status !== existingLead.status) {
            await Activity.create({
                type: 'STATUS_CHANGED',
                description: `Status changed from ${existingLead.status} to ${status}`,
                userId: req.user.id,
                leadId: lead.id
            });
        } else {
            await Activity.create({
                type: 'LEAD_UPDATED',
                description: `Lead ${lead.name} updated`,
                userId: req.user.id,
                leadId: lead.id
            });
        }

        res.json(lead);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        await Lead.delete(req.params.id, req.user.clinic_id);

        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add message to lead
// @route   POST /api/leads/:id/messages
const addMessage = async (req, res) => {
    try {
        const { content, type, isBusiness } = req.body;

        const lead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const message = await Message.create({
            content,
            type,
            isBusiness: isBusiness || false,
            leadId: lead.id
        });

        // Update last contacted
        await Lead.updateLastContacted(lead.id);

        // Log activity
        await Activity.create({
            type: type === 'SENT' ? 'MESSAGE_SENT' : 'MESSAGE_RECEIVED',
            description: `${type === 'SENT' ? 'Sent' : 'Received'} message: ${content.substring(0, 50)}...`,
            userId: req.user.id,
            leadId: lead.id
        });

        res.status(201).json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Bulk update leads
// @route   POST /api/leads/bulk
const bulkUpdate = async (req, res) => {
    try {
        const { leadIds, data } = req.body;

        const updated = await Lead.bulkUpdate(leadIds, req.user.clinic_id, data);

        await Activity.create({
            type: 'LEAD_UPDATED',
            description: `Bulk updated ${updated.length} leads`,
            userId: req.user.id
        });

        res.json({
            message: `Successfully updated ${updated.length} leads`,
            count: updated.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get leads needing follow-up
// @route   GET /api/leads/followup/needed
const getFollowupNeeded = async (req, res) => {
    try {
        const leads = await Lead.getFollowupNeeded(req.user.clinic_id);
        res.json(leads);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    addMessage,
    bulkUpdate,
    getFollowupNeeded
};