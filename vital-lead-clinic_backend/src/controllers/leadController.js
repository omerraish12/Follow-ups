const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { sendWhatsAppMessage, isWhatsAppConfiguredForClinic } = require('../services/whatsappService');
const { canUseFreeText } = require('../utils/freeTextWindow');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'HOT', 'CLOSED', 'LOST']);

const normalizeLeadStatus = (status) => {
    if (!status || typeof status !== 'string') return undefined;
    const normalized = status.trim().toUpperCase();
    return ALLOWED_LEAD_STATUSES.has(normalized) ? normalized : undefined;
};

const annotateLeadWithFreeText = (lead) => ({
    ...lead,
    can_use_free_text: canUseFreeText(lead?.last_inbound_message_at)
});

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
        const annotatedLeads = leads.map(annotateLeadWithFreeText);

        res.json(annotatedLeads);
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

        const annotatedLead = annotateLeadWithFreeText(lead);
        res.json({
            ...annotatedLead,
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
            assignedToId,
            consentGiven,
            consentTimestamp
        } = req.body;

        const normalizedStatus = normalizeLeadStatus(status) || 'NEW';

        const resolvedConsentTimestamp = consentGiven
            ? consentTimestamp || new Date().toISOString()
            : null;

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
            clinicId: req.user.clinic_id,
            consentGiven: Boolean(consentGiven),
            consentTimestamp: resolvedConsentTimestamp
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
        const { name, phone, email, service, status, source, value, notes, nextFollowUp, assignedToId, lastVisitDate, followUpSent, consentGiven, consentTimestamp } = req.body;

        const existingLead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!existingLead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const normalizedStatus = normalizeLeadStatus(status);
        const parsedVisitDate = lastVisitDate ? new Date(lastVisitDate) : null;
        const normalizedVisitDate =
            parsedVisitDate && !Number.isNaN(parsedVisitDate.getTime())
                ? parsedVisitDate.toISOString().split('T')[0]
                : null;
        const visitDateValue = normalizedVisitDate || (normalizedStatus === 'CLOSED' ? new Date().toISOString().split('T')[0] : null);

        const updatePayload = {
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
        };

        if (visitDateValue) {
            updatePayload.lastVisitDate = visitDateValue;
            updatePayload.followUpSent = false;
        } else if (followUpSent !== undefined) {
            updatePayload.followUpSent = followUpSent;
        }

        if (consentGiven !== undefined) {
            updatePayload.consentGiven = Boolean(consentGiven);
            updatePayload.consentTimestamp = consentGiven
                ? (consentTimestamp ? new Date(consentTimestamp).toISOString() : new Date().toISOString())
                : null;
        }

        const lead = await Lead.update(req.params.id, req.user.clinic_id, updatePayload);

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
        console.log("_________Lead @nd Clinic: _________", lead, req.user);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const freeTextAllowed = canUseFreeText(lead.last_inbound_message_at);

        if (type === 'SENT') {
            const whatsappConfigured = await isWhatsAppConfiguredForClinic(req.user.clinic_id);
            if (!whatsappConfigured) {
                return res.status(400).json({ message: 'WhatsApp integration is not configured for this clinic.' });
            }
            if (!freeTextAllowed) {
                return res.status(403).json({
                    message: 'The 24-hour free-text window has closed. Please send an approved template instead.'
                });
            }
            if (!lead.phone) {
                return res.status(400).json({ message: 'Lead phone number is required to send WhatsApp messages.' });
            }

            try {
                console.log("_____________send______________", lead.phone, content, req.user.clinic_id);
                await sendWhatsAppMessage({
                    to: lead.phone,
                    body: content,
                    clinicId: req.user.clinic_id
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

        if (type === 'RECEIVED') {
            await Lead.update(lead.id, req.user.clinic_id, { lastInboundMessageAt: new Date() });
        }

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
