const Automation = require('../models/Automation');
const Execution = require('../models/Execution');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { query } = require('../config/database');
const {
    submitTemplateForApproval,
    refreshTemplateApprovalStatus,
    isWhatsAppConfiguredForClinic,
    getWhatsAppProviderForClinic
} = require('../services/whatsappService');
const { isMetaCloudProvider } = require('../utils/whatsappProvider');

const submitTemplateApprovalForAutomation = async (automationId, clinicId, templatePayload) => {
    if (!templatePayload || !templatePayload.templateName || !templatePayload.message) {
        return null;
    }

    try {
        const provider = await getWhatsAppProviderForClinic(clinicId);
        if (!isMetaCloudProvider(provider)) {
            return Automation.updateTemplateMetadata(automationId, clinicId, {
                templateStatus: 'approved',
                templateSid: null,
                templateApprovalSid: null
            });
        }

        const approval = await submitTemplateForApproval({
            clinicId,
            templateName: templatePayload.templateName,
            language: templatePayload.language,
            message: templatePayload.message,
            components: templatePayload.components,
            personalization: templatePayload.personalization
        });
        if (approval) {
            return Automation.updateTemplateMetadata(automationId, clinicId, {
                templateStatus: approval.status,
                templateSid: approval.contentSid,
                templateApprovalSid: approval.approvalSid
            });
        }
    } catch (error) {
        console.error('Template approval submission failed:', error);
        await IntegrationLog.create({
            type: 'template_approval',
            message: error.response?.data?.message || error.message || 'Template approval submission failed',
            metadata: {
                automationId,
                templateName: templatePayload?.templateName,
                clinicId,
                error: error.response?.data || error.message
            },
            clinicId
        });
    }
    return null;
};

const parseAutomationComponents = (components) => {
    if (!components) {
        return [];
    }
    if (Array.isArray(components)) {
        return components;
    }
    try {
        const parsed = JSON.parse(components);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const getTemplateLogLevel = (status) => {
    if (status === 'rejected') return 'warning';
    if (status === 'approved') return 'info';
    return 'info';
};

const logTemplateStatusChange = async ({
    automation,
    templateStatus,
    clinicId,
    templateSid,
    previousStatus,
    source = 'submission'
}) => {
    try {
        await IntegrationLog.create({
            type: 'template_status',
            level: getTemplateLogLevel(templateStatus),
            message: `Template "${automation.template_name || automation.name}" status is ${templateStatus}`,
            metadata: {
                automationId: automation.id,
                templateName: automation.template_name || automation.name,
                templateStatus,
                previousStatus,
                templateSid,
                source
            },
            clinicId
        });
    } catch (error) {
        console.error('Failed to log template status change:', error);
    }
};

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

const getAutomationTemplates = async (req, res) => {
    try {
        const statusFilter = req.query.status;
        const conditions = ['clinic_id = $1', 'template_name IS NOT NULL'];
        const params = [req.user.clinic_id];
        if (statusFilter) {
            params.push(statusFilter);
            conditions.push(`template_status = $${params.length}`);
        }
        const result = await query(
            `SELECT id, name, template_name, template_language, template_status, template_sid, template_approval_sid, components
             FROM automations
             WHERE ${conditions.join(' AND ')}
             ORDER BY template_status, name`,
            params
        );

        const templates = result.rows.map((row) => ({
            automationId: row.id,
            automationName: row.name,
            templateName: row.template_name,
            templateLanguage: row.template_language || 'en',
            templateStatus: (row.template_status || 'pending').toLowerCase(),
            templateSid: row.template_sid || null,
            templateApprovalSid: row.template_approval_sid || null,
            components: parseAutomationComponents(row.components)
        }));

        res.json(templates);
    } catch (error) {
        console.error('Error fetching automation templates:', error);
        res.status(500).json({ message: 'Unable to fetch automation templates' });
    }
};

const refreshTemplateStatus = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);
        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        if (!automation.template_sid) {
            const provider = await getWhatsAppProviderForClinic(req.user.clinic_id);
            if (!isMetaCloudProvider(provider)) {
                const updated = await Automation.updateTemplateMetadata(automation.id, req.user.clinic_id, {
                    templateStatus: 'approved',
                    templateSid: null,
                    templateApprovalSid: null
                });
                return res.json(updated || automation);
            }
            return res.status(400).json({ message: 'Automation does not have a submitted template' });
        }

        const statusUpdate = await refreshTemplateApprovalStatus({
            clinicId: req.user.clinic_id,
            contentSid: automation.template_sid
        });

        if (!statusUpdate) {
            return res.json(automation);
        }

        const updated = await Automation.updateTemplateMetadata(automation.id, req.user.clinic_id, {
            templateStatus: statusUpdate.status,
            templateSid: statusUpdate.contentSid,
            templateApprovalSid: statusUpdate.approvalSid
        });

        if (updated) {
            await logTemplateStatusChange({
                automation,
                templateStatus: statusUpdate.status,
                previousStatus: automation.template_status,
                templateSid: statusUpdate.contentSid,
                clinicId: req.user.clinic_id,
                source: 'manual_refresh'
            });
        }

        res.json(updated || automation);
    } catch (error) {
        console.error('Error refreshing template status:', error);
        res.status(500).json({ message: 'Unable to refresh template status' });
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
            components,
            preAppointment,
            preAppointmentMinutes
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
            preAppointment,
            preAppointmentMinutes,
            dailyCap: req.body.dailyCap,
            cooldownHours: req.body.cooldownHours,
            notifyOnReply: notifyOnReply !== undefined ? notifyOnReply : true,
            personalization: personalization || ['name'],
            clinicId: req.user.clinic_id
        });

        const templatePayload = {
            templateName: templateName,
            language: templateLanguage,
            message,
            components,
            personalization
        };
        const submittedAutomation = await submitTemplateApprovalForAutomation(automation.id, req.user.clinic_id, templatePayload);
        const automationResponse = submittedAutomation || automation;

        if (submittedAutomation) {
            await logTemplateStatusChange({
                automation,
                templateStatus: automationResponse.template_status,
                previousStatus: automation.template_status,
                templateSid: automationResponse.template_sid,
                clinicId: req.user.clinic_id,
                source: 'initial_submission'
            });
        }

        await Notification.create({
            type: 'system',
            title: 'Automation created',
            message: `Automation "${automationResponse.name}" was created.`,
            priority: 'low',
            actionLabel: 'View automations',
            actionLink: '/automations',
            metadata: { automationId: automationResponse.id, automationName: automationResponse.name },
            userId: null,
            clinicId: req.user.clinic_id
        });

        res.status(201).json(automationResponse);
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
            components,
            preAppointment,
            preAppointmentMinutes
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
            components,
            preAppointment,
            preAppointmentMinutes,
            dailyCap: req.body.dailyCap,
            cooldownHours: req.body.cooldownHours
        });
        const templatePayload = {
            templateName: templateName || updated?.template_name,
            language: templateLanguage || updated?.template_language,
            message: message || updated?.message,
            components: components || updated?.components,
            personalization: personalization || updated?.personalization
        };
        const submittedAutomation = await submitTemplateApprovalForAutomation(updated.id, req.user.clinic_id, templatePayload);
        const automationResponse = submittedAutomation || updated;

        if (submittedAutomation) {
            await logTemplateStatusChange({
                automation: updated,
                templateStatus: automationResponse.template_status,
                previousStatus: updated.template_status,
                templateSid: automationResponse.template_sid,
                clinicId: req.user.clinic_id,
                source: 'update_submission'
            });
        }
        res.json(automationResponse);
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

// @desc    Resubmit automation template for approval
// @route   POST /api/automations/:id/resubmit-template
const resubmitTemplateApproval = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);
        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        const templatePayload = {
            templateName: automation.template_name,
            language: automation.template_language,
            message: automation.message,
            components: automation.components,
            personalization: automation.personalization
        };

        if (!templatePayload.templateName) {
            return res.status(400).json({ message: 'Automation does not have a template configured' });
        }

        const whatsappConfigured = await isWhatsAppConfiguredForClinic(req.user.clinic_id);
        if (!whatsappConfigured) {
            return res.status(400).json({ message: 'WhatsApp credentials are not configured. Connect a WhatsApp Business account before resubmitting.' });
        }

        const submittedAutomation = await submitTemplateApprovalForAutomation(automation.id, req.user.clinic_id, templatePayload);
        const automationResponse = submittedAutomation || automation;
        if (submittedAutomation) {
            await logTemplateStatusChange({
                automation,
                templateStatus: automationResponse.template_status,
                previousStatus: automation.template_status,
                templateSid: automationResponse.template_sid,
                clinicId: req.user.clinic_id,
                source: 'resubmission'
            });
        }
        res.json(automationResponse);
    } catch (error) {
        console.error('Template resubmission failed:', error);
        res.status(500).json({ message: 'Unable to resubmit template for approval' });
    }
};

// @desc    Manually mark an automation template as approved (used when templates are approved via app)
// @route   POST /api/automations/:id/approve-template
const approveTemplate = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id, req.user.clinic_id);
        if (!automation) {
            return res.status(404).json({ message: 'Automation not found' });
        }

        if (!automation.template_name) {
            return res.status(400).json({ message: 'Automation does not have a template configured' });
        }

        const templateSid = req.body.templateSid || automation.template_sid;
        const templateApprovalSid = req.body.templateApprovalSid || automation.template_approval_sid;
        const updated = await Automation.updateTemplateMetadata(automation.id, req.user.clinic_id, {
            templateStatus: 'approved',
            templateSid: templateSid || null,
            templateApprovalSid: templateApprovalSid || null
        });

        if (updated) {
            await logTemplateStatusChange({
                automation,
                templateStatus: 'approved',
                previousStatus: automation.template_status,
                templateSid: updated.template_sid,
                clinicId: req.user.clinic_id,
                source: 'manual_approval'
            });
        }

        res.json(updated || automation);
    } catch (error) {
        console.error('Template approval override failed:', error);
        res.status(500).json({ message: 'Unable to mark template as approved' });
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

// @desc    Get delivery status stats for automation messages
// @route   GET /api/automations/stats/delivery
const getDeliveryStats = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE delivery_status = 'queued')    AS queued,
                COUNT(*) FILTER (WHERE delivery_status = 'sent')      AS sent,
                COUNT(*) FILTER (WHERE delivery_status = 'delivered') AS delivered,
                COUNT(*) FILTER (WHERE delivery_status = 'read')      AS read,
                COUNT(*) FILTER (WHERE delivery_status = 'failed')    AS failed
             FROM messages m
             JOIN leads l ON l.id = m.lead_id
             WHERE l.clinic_id = $1
               AND m.message_origin IN ('automation','template')`,
            [req.user.clinic_id]
        );
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Delivery stats error:', error);
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
    getAutomationTemplates,
    refreshTemplateStatus,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getPerformanceStats,
    getDeliveryStats,
    resubmitTemplateApproval,
    approveTemplate,
    getRecentReplies
};
