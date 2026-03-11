const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const {
    sendWhatsAppMessage,
    sendTemplateMessage,
    isWhatsAppConfiguredForClinic,
    getWhatsAppProviderForClinic
} = require('../services/whatsappService');
const { canUseFreeText } = require('../utils/freeTextWindow');
const { isMetaCloudProvider } = require('../utils/whatsappProvider');

const DEFAULT_WELCOME_TEMPLATE = {
    name: 'lead_welcome',
    language: 'en',
    body: 'Hi {name}, thanks for contacting our clinic! A team member will reach out shortly.'
};

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'HOT', 'CLOSED', 'LOST']);

const firstNameOrDefault = (name) => {
    if (!name) return 'there';
    const first = String(name).trim().split(/\s+/)[0];
    return first || 'there';
};

const normalizeLeadStatus = (status) => {
    if (!status || typeof status !== 'string') return undefined;
    const normalized = status.trim().toUpperCase();
    return ALLOWED_LEAD_STATUSES.has(normalized) ? normalized : undefined;
};

const normalizeEntryCode = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
};

const annotateLeadWithFreeText = (lead) => ({
    ...lead,
    can_use_free_text: canUseFreeText(lead?.last_inbound_message_at)
});

const extractProviderMessageId = (response) =>
    response?.messages?.[0]?.id || response?.messageId || null;

const normalizeMessageFilters = (query = {}) => ({
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
    direction: typeof query.direction === 'string' ? query.direction.trim().toLowerCase() : undefined,
    status: typeof query.status === 'string' ? query.status.trim().toLowerCase() : undefined,
    origin: typeof query.origin === 'string' ? query.origin.trim().toLowerCase() : undefined,
    dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom.trim() : undefined,
    dateTo: typeof query.dateTo === 'string' ? query.dateTo.trim() : undefined
});

const buildRetryMetadata = (message, extraMetadata = {}) => ({
    retryCount: Number(message?.metadata?.retryCount || 0) + 1,
    lastRetryAt: new Date().toISOString(),
    ...extraMetadata
});

const retryOutboundMessage = async ({ lead, clinicId, message }) => {
    const metadata = message?.metadata || {};
    const templateName = metadata.templateName || null;
    const language = metadata.language || metadata.templateLanguage || undefined;
    const mediaUrl = metadata.mediaUrl || null;
    const templateParameters = Array.isArray(metadata.templateParameters)
        ? metadata.templateParameters
        : [];
    const components = Array.isArray(metadata.components)
        ? metadata.components
        : [];

    if (templateName) {
        return sendTemplateMessage({
            to: lead.phone,
            templateName,
            language,
            components,
            mediaUrl,
            body: message.content,
            templateParameters,
            clinicId
        });
    }

    return sendWhatsAppMessage({
        to: lead.phone,
        body: message.content,
        mediaUrl,
        clinicId
    });
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

        const messagePage = await Message.findByLeadId(lead.id, { limit: req.query.messageLimit || 50 });
        const messageCount = await Message.countByLeadId(lead.id);

        // Get activities
        const activities = await Activity.findByLeadId(lead.id);

        const annotatedLead = annotateLeadWithFreeText(lead);
        res.json({
            ...annotatedLead,
            messages: messagePage.messages,
            message_count: messageCount,
            messagePagination: messagePage.pagination,
            activities
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get paginated / changed message history for a lead
// @route   GET /api/leads/:id/messages
const getLeadMessages = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const { before, after, limit } = req.query;
        const messageFilters = normalizeMessageFilters(req.query);
        const messagesResult = after
            ? {
                messages: await Message.findChangedSince(lead.id, after, messageFilters),
                pagination: {
                    hasMore: false,
                    nextCursor: null,
                    limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100)
                }
            }
            : await Message.findByLeadId(lead.id, { before, limit, ...messageFilters });

        const annotatedLead = annotateLeadWithFreeText(lead);
        const totalMessageCount = await Message.countByLeadId(lead.id);
        const filteredMessageCount = await Message.countByLeadId(lead.id, messageFilters);

        res.json({
            messages: messagesResult.messages,
            pagination: messagesResult.pagination,
            lead: {
                id: lead.id,
                last_inbound_message_at: annotatedLead.last_inbound_message_at || null,
                can_use_free_text: annotatedLead.can_use_free_text,
                message_count: totalMessageCount,
                filtered_message_count: filteredMessageCount
            }
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
            entryCode,
            nextFollowUp,
            assignedToId,
            consentGiven,
            consentTimestamp
        } = req.body;

        const normalizedStatus = normalizeLeadStatus(status) || 'NEW';

        const resolvedConsentTimestamp = consentGiven
            ? consentTimestamp || new Date().toISOString()
            : null;

        const sanitizedEntryCode = normalizeEntryCode(entryCode);

        const lead = await Lead.create({
            name,
            phone,
            email,
            service,
            status: normalizedStatus,
            source,
            value: parseFloat(value) || 0,
            notes,
            entryCode: sanitizedEntryCode === undefined ? null : sanitizedEntryCode,
            nextFollowUp: nextFollowUp === '' ? null : nextFollowUp,
            assignedToId,
            clinicId: req.user.clinic_id,
            consentGiven: Boolean(consentGiven),
            consentTimestamp: resolvedConsentTimestamp
        });

        console.log("_____Lead Created_____: ", lead);

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

        // Auto-send a friendly welcome message when WhatsApp is connected and consent is granted.
        if (lead.phone && lead.consent_given) {
            const whatsappConfigured = await isWhatsAppConfiguredForClinic(req.user.clinic_id);
            if (whatsappConfigured) {
                const greetingName = firstNameOrDefault(lead.name);
                const welcomeBody = DEFAULT_WELCOME_TEMPLATE.body.replace('{name}', greetingName);
                const templateParameters = [greetingName];
                try {
                    const providerResponse = await sendTemplateMessage({
                        to: lead.phone,
                        body: welcomeBody,
                        templateName: DEFAULT_WELCOME_TEMPLATE.name,
                        language: DEFAULT_WELCOME_TEMPLATE.language,
                        templateParameters,
                        clinicId: req.user.clinic_id
                    });
                    const providerMessageId = extractProviderMessageId(providerResponse);
                    await Message.create({
                        content: welcomeBody,
                        type: 'SENT',
                        isBusiness: true,
                        leadId: lead.id,
                        providerMessageId,
                        deliveryStatus: 'sent',
                        messageOrigin: 'automation',
                        metadata: {
                            templateName: DEFAULT_WELCOME_TEMPLATE.name,
                            language: DEFAULT_WELCOME_TEMPLATE.language,
                            templateParameters,
                            automation: 'default_welcome'
                        }
                    });
                    await Lead.updateLastContacted(lead.id);
                    await Activity.create({
                        type: 'MESSAGE_SENT',
                        description: 'Sent automatic WhatsApp welcome message.',
                        userId: req.user.id,
                        leadId: lead.id
                    });
                } catch (error) {
                    await Message.create({
                        content: DEFAULT_WELCOME_TEMPLATE.body.replace('{name}', firstNameOrDefault(lead.name)),
                        type: 'SENT',
                        isBusiness: true,
                        leadId: lead.id,
                        deliveryStatus: 'failed',
                        messageOrigin: 'automation',
                        deliveryError: error.response?.data?.message || error.message || 'Failed to send welcome message.',
                        metadata: {
                            templateName: DEFAULT_WELCOME_TEMPLATE.name,
                            language: DEFAULT_WELCOME_TEMPLATE.language,
                            templateParameters,
                            automation: 'default_welcome',
                            providerError: error.response?.data || error.message
                        }
                    });
                    await IntegrationLog.create({
                        type: 'whatsapp_send',
                        message: 'Automatic welcome message failed',
                        metadata: {
                            leadId: lead.id,
                            templateName: DEFAULT_WELCOME_TEMPLATE.name,
                            error: error.response?.data || error.message
                        },
                        clinicId: req.user.clinic_id
                    });
                }
            } else {
                await IntegrationLog.create({
                    type: 'whatsapp_send',
                    message: 'Skipped welcome message because WhatsApp is not connected',
                    metadata: { leadId: lead.id },
                    clinicId: req.user.clinic_id
                });
            }
        }

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
        const { name, phone, email, service, status, source, value, notes, nextFollowUp, assignedToId, lastVisitDate, followUpSent, consentGiven, consentTimestamp, entryCode } = req.body;

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

        const sanitizedEntryCode = normalizeEntryCode(entryCode);
        if (sanitizedEntryCode !== undefined) {
            updatePayload.entryCode = sanitizedEntryCode;
        }

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
        const { content, type, isBusiness, mediaUrl } = req.body;

        const lead = await Lead.findById(req.params.id, req.user.clinic_id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const freeTextAllowed = canUseFreeText(lead.last_inbound_message_at);
        const provider = await getWhatsAppProviderForClinic(req.user.clinic_id);
        const enforceMetaWindow = isMetaCloudProvider(provider);

        if (type === 'SENT') {
            const whatsappConfigured = await isWhatsAppConfiguredForClinic(req.user.clinic_id);
            if (!whatsappConfigured) {
                return res.status(400).json({ message: 'WhatsApp integration is not configured for this clinic.' });
            }
            if (enforceMetaWindow && !freeTextAllowed) {
                return res.status(403).json({
                    message: 'The 24-hour free-text window has closed. Please send an approved template instead.'
                });
            }
            if (!lead.phone) {
                return res.status(400).json({ message: 'Lead phone number is required to send WhatsApp messages.' });
            }

            const pendingMessage = await Message.create({
                content,
                type,
                isBusiness: isBusiness || false,
                leadId: lead.id,
                deliveryStatus: 'pending',
                messageOrigin: 'manual',
                metadata: mediaUrl ? { mediaUrl } : {}
            });

            try {
                const providerResponse = await sendWhatsAppMessage({
                    to: lead.phone,
                    body: content,
                    mediaUrl,
                    clinicId: req.user.clinic_id
                });
                const providerMessageId = extractProviderMessageId(providerResponse);
                const message = await Message.updateDeliveryById(pendingMessage.id, {
                    providerMessageId,
                    deliveryStatus: 'sent',
                    deliveryError: null,
                    metadata: {
                        mediaUrl,
                        providerResponse
                    }
                });

                await Lead.updateLastContacted(lead.id);

                await Activity.create({
                    type: 'MESSAGE_SENT',
                    description: `Sent message: ${content.substring(0, 50)}...`,
                    userId: req.user.id,
                    leadId: lead.id
                });

                return res.status(201).json(message);
            } catch (error) {
                console.error('WhatsApp send failed:', error);
                const failedMessage = await Message.updateDeliveryById(pendingMessage.id, {
                    deliveryStatus: 'failed',
                    deliveryError: error.response?.data?.error?.message || error.message || 'Failed to deliver WhatsApp message.',
                    metadata: {
                        mediaUrl,
                        providerError: error.response?.data || error.message
                    }
                });
                return res.status(502).json({
                    message: 'Failed to deliver WhatsApp message.',
                    messageRecord: failedMessage
                });
            }
        }

        const message = await Message.create({
            content,
            type,
            isBusiness: isBusiness || false,
            leadId: lead.id,
            deliveryStatus: type === 'RECEIVED' ? 'received' : null,
            messageOrigin: type === 'RECEIVED' ? 'patient' : 'manual',
            metadata: mediaUrl ? { mediaUrl } : {}
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

// @desc    Retry a failed outbound message
// @route   POST /api/leads/:id/messages/:messageId/retry
const retryMessage = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id, req.user.clinic_id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        const message = await Message.findById(req.params.messageId, lead.id);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.type !== 'SENT' || (message.delivery_status || '').toLowerCase() !== 'failed') {
            return res.status(400).json({ message: 'Only failed outbound messages can be retried.' });
        }

        if (!lead.phone) {
            return res.status(400).json({ message: 'Lead phone number is required to send WhatsApp messages.' });
        }

        if (!(await isWhatsAppConfiguredForClinic(req.user.clinic_id))) {
            return res.status(400).json({ message: 'WhatsApp integration is not configured for this clinic.' });
        }

        const isTemplateMessage = Boolean(message.metadata?.templateName);
        const freeTextAllowed = canUseFreeText(lead.last_inbound_message_at);
        const provider = await getWhatsAppProviderForClinic(req.user.clinic_id);
        if (isMetaCloudProvider(provider) && !freeTextAllowed && !isTemplateMessage) {
            return res.status(403).json({
                message: 'The 24-hour free-text window has closed. Please send an approved template instead.'
            });
        }

        const pending = await Message.updateDeliveryById(message.id, {
            deliveryStatus: 'pending',
            deliveryError: null,
            metadata: buildRetryMetadata(message)
        });

        try {
            const providerResponse = await retryOutboundMessage({
                lead,
                clinicId: req.user.clinic_id,
                message
            });

            const providerMessageId = extractProviderMessageId(providerResponse);
            const updated = await Message.updateDeliveryById(message.id, {
                providerMessageId,
                deliveryStatus: 'sent',
                deliveryError: null,
                metadata: {
                    ...buildRetryMetadata(message),
                    providerResponse
                }
            });

            await Lead.updateLastContacted(lead.id);
            await Activity.create({
                type: 'MESSAGE_SENT',
                description: `Retried message: ${message.content.substring(0, 50)}...`,
                userId: req.user.id,
                leadId: lead.id
            });
            return res.json(updated || pending);
        } catch (error) {
            const failed = await Message.updateDeliveryById(message.id, {
                deliveryStatus: 'failed',
                deliveryError: error.response?.data?.error?.message || error.message || 'Failed to deliver WhatsApp message.',
                metadata: {
                    ...buildRetryMetadata(message),
                    providerError: error.response?.data || error.message
                }
            });
            return res.status(502).json({
                message: 'Failed to deliver WhatsApp message.',
                messageRecord: failed || pending
            });
        }
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
    getLeadMessages,
    createLead,
    updateLead,
    deleteLead,
    addMessage,
    retryMessage,
    bulkUpdate,
    getFollowupNeeded
};
