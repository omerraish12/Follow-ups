const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'HOT', 'CLOSED', 'LOST']);

const normalizeLeadStatus = (status) => {
    if (!status || typeof status !== 'string') return undefined;
    const normalized = status.trim().toUpperCase();
    return ALLOWED_LEAD_STATUSES.has(normalized) ? normalized : undefined;
};

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

        const {
            name,
            phone,
            email,
            service,
            status,
            source,
            value,
            notes,
            nextFollowUp,
            assignedToId
        } = req.body;

        const normalizedStatus = normalizeLeadStatus(status) || 'NEW';

        const lead = await Lead.create({
            name,
            phone,
            email,
            service,
            status: normalizedStatus,
            source,
            value: parseFloat(value) || 0,
            notes,
            nextFollowUp: nextFollowUp === '' ? null : nextFollowUp,
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

        // Create notification
        await Notification.create({
            type: 'lead',
            title: 'New lead added',
            message: `Lead ${lead.name} was created.`,
            priority: lead.value && Number(lead.value) >= 1000 ? 'high' : 'medium',
            actionLabel: 'View lead',
            actionLink: `/leads/${lead.id}`,
            metadata: { leadId: lead.id, leadName: lead.name, value: lead.value },
            userId: lead.assigned_to_id || null,
            clinicId: req.user.clinic_id
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
        const { name, phone, email, service, status, source, value, notes, nextFollowUp, assignedToId } = req.body;

        const existingLead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!existingLead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const normalizedStatus = normalizeLeadStatus(status);

        const lead = await Lead.update(req.params.id, req.user.clinic_id, {
            name,
            phone,
            email,
            service,
            status: normalizedStatus,
            source,
            value: value !== undefined && value !== null ? parseFloat(value) : undefined,
            notes,
            nextFollowUp: nextFollowUp === '' ? null : nextFollowUp,
            assignedToId
        });

        // Log status change
        if (normalizedStatus && normalizedStatus !== existingLead.status) {
            await Activity.create({
                type: 'STATUS_CHANGED',
                description: `Status changed from ${existingLead.status} to ${normalizedStatus}`,
                userId: req.user.id,
                leadId: lead.id
            });

            let notifType = 'system';
            let notifPriority = 'medium';
            let notifTitle = 'Lead status updated';
            let notifMessage = `Lead ${lead.name} moved to ${normalizedStatus}.`;

            if (normalizedStatus === 'HOT') {
                notifType = 'alert';
                notifPriority = 'high';
                notifTitle = 'Lead is hot';
                notifMessage = `Lead ${lead.name} is now HOT.`;
            } else if (normalizedStatus === 'CLOSED') {
                notifType = 'success';
                notifPriority = 'high';
                notifTitle = 'Lead closed';
                notifMessage = `Lead ${lead.name} was closed.`;
            } else if (normalizedStatus === 'LOST') {
                notifType = 'alert';
                notifPriority = 'medium';
                notifTitle = 'Lead lost';
                notifMessage = `Lead ${lead.name} was marked as lost.`;
            }

            await Notification.create({
                type: notifType,
                title: notifTitle,
                message: notifMessage,
                priority: notifPriority,
                actionLabel: 'View lead',
                actionLink: `/leads/${lead.id}`,
                metadata: { leadId: lead.id, leadName: lead.name, status: normalizedStatus },
                userId: lead.assigned_to_id || null,
                clinicId: req.user.clinic_id
            });
        } else {
            await Activity.create({
                type: 'LEAD_UPDATED',
                description: `Lead ${lead.name} updated`,
                userId: req.user.id,
                leadId: lead.id
            });
        }

        // Notify assignee if changed
        if (assignedToId !== undefined && String(assignedToId) !== String(existingLead.assigned_to_id || '')) {
            if (assignedToId) {
                await Notification.create({
                    type: 'lead',
                    title: 'Lead assigned',
                    message: `Lead ${lead.name} was assigned to you.`,
                    priority: 'medium',
                    actionLabel: 'View lead',
                    actionLink: `/leads/${lead.id}`,
                    metadata: { leadId: lead.id, leadName: lead.name },
                    userId: assignedToId,
                    clinicId: req.user.clinic_id
                });
            }
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

        if (type === 'SENT') {
            if (!lead.phone) {
                return res.status(400).json({ message: 'Lead phone number is required to send WhatsApp messages.' });
            }

            try {
                await sendWhatsAppMessage({
                    to: lead.phone,
                    body: content
                });
            } catch (error) {
                console.error('WhatsApp send failed:', error);
                return res.status(502).json({ message: 'Failed to deliver WhatsApp message.' });
            }
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

        if (type === 'RECEIVED') {
            const preview = content.length > 80 ? `${content.substring(0, 80)}...` : content;
            await Notification.create({
                type: 'lead',
                title: 'New message received',
                message: `Message from ${lead.name}: ${preview}`,
                priority: 'high',
                actionLabel: 'Reply',
                actionLink: `/leads/${lead.id}`,
                metadata: { leadId: lead.id, leadName: lead.name },
                userId: lead.assigned_to_id || null,
                clinicId: req.user.clinic_id
            });
        }

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
