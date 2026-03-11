const cron = require('node-cron');
const Automation = require('../models/Automation');
const Execution = require('../models/Execution');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { query } = require('../config/database');
const { sendTemplateMessage, getWhatsAppProviderForClinic } = require('../services/whatsappService');
const { getClinicAdminId } = require('../utils/clinicHelpers');
const { canUseFreeText } = require('../utils/freeTextWindow');
const { isMetaCloudProvider } = require('../utils/whatsappProvider');
const { isWithinQuietHoursForClinic } = require('../utils/quietHours');
const { DateTime } = require('luxon');
const { processPendingMessages } = require('./sendQueue');

const extractProviderMessageId = (response) =>
    response?.messages?.[0]?.id || response?.messageId || null;

const THREE_WEEK_TEMPLATE_NAME = 'three_week_followup';
const THREE_WEEK_TEMPLATE_LANGUAGE = 'en_US';
const THREE_WEEK_TEMPLATE_MESSAGE = 'Hi {{1}}, it has been 3 weeks since your visit at our clinic. We wanted to check in—how are you feeling? Reply to this message if you have any questions!';
const DAILY_AUTOMATION_CAP = parseInt(process.env.AUTOMATION_DAILY_CAP || '500', 10);
const LEAD_COOLDOWN_HOURS = parseInt(process.env.AUTOMATION_COOLDOWN_HOURS || '24', 10);
const RETENTION_DAYS = parseInt(process.env.MESSAGE_RETENTION_DAYS || '0', 10);
class CronJobs {
    init() {
        // Run every day at 8 AM
        cron.schedule('0 8 * * *', async () => {
            console.log('Running daily follow-up check...');
            await this.checkFollowups();
        });

        // Run every hour to check for scheduled automations
        cron.schedule('0 * * * *', async () => {
            console.log('Running hourly automation check...');
            await this.runAutomations();
        });

        // Run every day at 9 AM for 3-week follow-ups
        cron.schedule('0 9 * * *', async () => {
            console.log('Running 3-week follow-up automation...');
            await this.runThreeWeekFollowups();
        });

        // Process queued/failed WhatsApp sends every 2 minutes
        cron.schedule('*/2 * * * *', async () => {
            console.log('Processing queued WhatsApp messages...');
            await processPendingMessages();
        });

        // Bridge health ping every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            console.log('Checking WhatsApp bridge health...');
            await this.checkBridgeHealth();
        });

        // Nightly message retention purge
        if (RETENTION_DAYS > 0) {
            cron.schedule('30 3 * * *', async () => {
                console.log('Running message retention purge...');
                await this.purgeOldMessages();
            });
        }

        // Clear stale QR/error fields for long-disconnected sessions daily
        cron.schedule('30 2 * * *', async () => {
            await this.pruneStaleSessions();
        });

        console.log('Cron jobs initialized');
    }

    async checkFollowups() {
        try {
            // Get all clinics
            const clinics = await query('SELECT id FROM clinics');

            for (const clinic of clinics.rows) {
                const leads = await Lead.getFollowupNeeded(clinic.id);

                for (const lead of leads) {
                    const targetUserId = lead.assigned_to_id || (await getClinicAdminId(clinic.id));
                    await Activity.create({
                        type: 'AUTOMATION_RUN',
                        description: `Lead ${lead.name} needs follow-up (no contact for 3+ days)`,
                        userId: targetUserId,
                        leadId: lead.id
                    });

                    await Notification.create({
                        type: 'reminder',
                        title: 'Follow-up needed',
                        message: `Lead ${lead.name} needs a follow-up.`,
                        priority: 'high',
                        actionLabel: 'View lead',
                        actionLink: `/leads/${lead.id}`,
                        metadata: { leadId: lead.id, leadName: lead.name },
                        userId: targetUserId,
                        clinicId: clinic.id
                    });
                }
            }
        } catch (error) {
            console.error('Error checking follow-ups:', error);
        }
    }

    async checkBridgeHealth() {
        try {
            const clinics = await query(`SELECT id FROM clinics`);
            for (const clinic of clinics.rows) {
                try {
                    const session = await WhatsAppSession.findByClinicId(clinic.id);
                    const status = session?.status || 'disconnected';
                    if (status !== 'connected') {
                        await IntegrationLog.create({
                            type: 'whatsapp_health',
                            message: `Bridge disconnected (${status})`,
                            clinicId: clinic.id,
                            metadata: { status }
                        });
                    }
                } catch (error) {
                    console.error('Health check error for clinic', clinic.id, error.message);
                }
            }
        } catch (error) {
            console.error('Bridge health check failed', error.message);
        }
    }

    async purgeOldMessages() {
        try {
            const result = await query(
                `DELETE FROM messages
                 WHERE timestamp < NOW() - ($1 || ' days')::interval
                 RETURNING id`,
                [RETENTION_DAYS]
            );
            console.log(`Purged ${result.rowCount} old messages`);
        } catch (error) {
            console.error('Message retention purge failed', error.message);
        }
    }

    async pruneStaleSessions() {
        try {
            await query(`
              UPDATE whatsapp_sessions
              SET qr_code = NULL,
                  last_error = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE status = 'disconnected'
                AND updated_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
            `);
            console.log('Pruned stale WhatsApp session QR/error metadata');
        } catch (error) {
            console.error('Failed to prune stale WhatsApp sessions', error);
        }
    }

    async runThreeWeekFollowups() {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - 21);
            const targetDay = targetDate.toISOString().split('T')[0];

            const leadsResult = await query(
            `SELECT *
                 FROM leads
                 WHERE last_visit_date::date = $1
                   AND COALESCE(follow_up_sent, false) = false
                   AND COALESCE(consent_given, false) = true
                   AND phone IS NOT NULL`,
                [targetDay]
            );

            for (const lead of leadsResult.rows) {
                const provider = await getWhatsAppProviderForClinic(lead.clinic_id);
                if (isMetaCloudProvider(provider) && canUseFreeText(lead.last_inbound_message_at)) {
                    continue;
                }

                try {
                    const providerResponse = await sendTemplateMessage({
                        to: lead.phone,
                        templateName: THREE_WEEK_TEMPLATE_NAME,
                        language: THREE_WEEK_TEMPLATE_LANGUAGE,
                        body: THREE_WEEK_TEMPLATE_MESSAGE,
                        templateParameters: [lead.name || 'Customer'],
                        clinicId: lead.clinic_id
                    });

                    await Message.create({
                        content: THREE_WEEK_TEMPLATE_MESSAGE,
                        type: 'SENT',
                        isBusiness: true,
                        leadId: lead.id,
                        providerMessageId: extractProviderMessageId(providerResponse),
                        deliveryStatus: 'sent',
                        messageOrigin: 'automation',
                        metadata: {
                            templateName: THREE_WEEK_TEMPLATE_NAME,
                            language: THREE_WEEK_TEMPLATE_LANGUAGE,
                            templateParameters: [lead.name || 'Customer']
                        }
                    });
                } catch (error) {
                    await Message.create({
                        content: THREE_WEEK_TEMPLATE_MESSAGE,
                        type: 'SENT',
                        isBusiness: true,
                        leadId: lead.id,
                        deliveryStatus: 'failed',
                        messageOrigin: 'automation',
                        deliveryError: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Template send failed.',
                        metadata: {
                            templateName: THREE_WEEK_TEMPLATE_NAME,
                            language: THREE_WEEK_TEMPLATE_LANGUAGE,
                            templateParameters: [lead.name || 'Customer'],
                            providerError: error.response?.data || error.message
                        }
                    });
                    console.error('3-week follow-up send failed for lead:', lead.id, error.response?.data || error.message);
                    await IntegrationLog.create({
                        type: 'follow_up_3week',
                        message: error.response?.data?.message || error.message || '3-week follow-up failed',
                        metadata: {
                            leadId: lead.id,
                            clinicId: lead.clinic_id,
                            template: THREE_WEEK_TEMPLATE_NAME,
                            error: error.response?.data || error.message
                        },
                        clinicId: lead.clinic_id
                    });
                    continue;
                }

                await query('UPDATE leads SET follow_up_sent = TRUE WHERE id = $1', [lead.id]);
                await Lead.updateLastContacted(lead.id);

                console.log(`3-week follow-up template sent to lead ${lead.id}`);
            }
        } catch (error) {
            console.error('Error running 3-week follow-up automation:', error);
            await IntegrationLog.create({
                type: 'follow_up_3week',
                message: error.message || '3-week follow-up job failed',
                metadata: {
                    error: error.stack || ''
                }
            });
        }
    }


    async runAutomations() {
        try {
            const automations = await Automation.getActiveAutomations();

            for (const automation of automations) {
                await this.processAutomation(automation);
            }
        } catch (error) {
            console.error('Error running automations:', error);
        }
    }

    async processAutomation(automation) {
        try {
            const provider = await getWhatsAppProviderForClinic(automation.clinic_id);
            const integrationsResult = await query(
                `SELECT integration_settings FROM clinics WHERE id = $1`,
                [automation.clinic_id]
            );
            const integrations = integrationsResult.rows?.[0]?.integration_settings || {};
            const quietHours = automation.quiet_hours || integrations?.whatsapp?.quietHours || null;
            const enforceMetaRules = isMetaCloudProvider(provider);
            if (enforceMetaRules && automation.template_status && automation.template_status !== 'approved') {
                return;
            }
            const adminId = await getClinicAdminId(automation.clinic_id);
            const triggerDays = Array.isArray(automation.trigger_days) ? automation.trigger_days : [3, 7, 14];
            const parsedDailyCap = Number(automation.daily_cap);
            const parsedCooldown = Number(automation.cooldown_hours);
            const dailyCap = Number.isFinite(parsedDailyCap) ? parsedDailyCap : DAILY_AUTOMATION_CAP;
            const cooldownHours = Number.isFinite(parsedCooldown) ? parsedCooldown : LEAD_COOLDOWN_HOURS;

            for (const days of triggerDays) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - days);
                targetDate.setHours(0, 0, 0, 0);

                const leads = await query(
                    `SELECT l.* 
           FROM leads l
           WHERE l.clinic_id = $1 
             AND ($2::lead_status IS NULL OR l.status = $2::lead_status)
             AND COALESCE(l.last_contacted, l.created_at) <= $3
             AND COALESCE(l.consent_given, false) = true
             AND NOT EXISTS (
               SELECT 1 FROM executions e 
               WHERE e.lead_id = l.id 
                 AND e.automation_id = $4
                 AND e.executed_at >= $3
             )`,
                    [automation.clinic_id, automation.target_status || null, targetDate, automation.id]
                );

                // Daily cap per automation
                const todayCountResult = await query(
                    `SELECT COUNT(*) FROM executions WHERE automation_id = $1 AND executed_at::date = CURRENT_DATE`,
                    [automation.id]
                );
                const todaysCount = Number(todayCountResult.rows?.[0]?.count || 0);
                if (dailyCap > 0 && todaysCount >= dailyCap) {
                    await IntegrationLog.create({
                        type: 'whatsapp_send',
                        message: 'Automation daily cap reached; skipping sends',
                        clinicId: automation.clinic_id,
                        metadata: { automationId: automation.id, cap: dailyCap }
                    });
                    continue;
                }

                for (const lead of leads.rows) {
                    if (enforceMetaRules && canUseFreeText(lead.last_inbound_message_at)) {
                        continue;
                    }

                    if (!lead.phone) {
                        continue;
                    }

                    // Per-lead cooldown
                    if (cooldownHours > 0) {
                        const cooldownResult = await query(
                            `SELECT 1 FROM executions 
                             WHERE lead_id = $1 
                               AND automation_id = $2 
                               AND executed_at >= NOW() - ($3 || ' hours')::interval
                             LIMIT 1`,
                            [lead.id, automation.id, cooldownHours]
                        );
                        if (cooldownResult.rows.length) {
                            continue;
                        }
                    }

                    const messageBody = this.renderAutomationMessage(automation, lead);
                    if (!messageBody) {
                        continue;
                    }

                    const templateParameters = this.buildTemplateParameters(automation.personalization, lead);

                    try {
                        if (await isWithinQuietHoursForClinic(lead.clinic_id, quietHours)) {
                            await IntegrationLog.create({
                                type: 'whatsapp_send',
                                message: 'Skipped send due to quiet hours window',
                                clinicId: lead.clinic_id,
                                metadata: {
                                    automationId: automation.id,
                                    leadId: lead.id
                                }
                            });
                            continue;
                        }

                        await Message.create({
                            content: messageBody,
                            type: 'SENT',
                            isBusiness: true,
                            leadId: lead.id,
                            deliveryStatus: 'queued',
                            messageOrigin: 'automation',
                            metadata: {
                                automationId: automation.id,
                                templateName: automation.template_name || automation.name,
                                language: automation.template_language || 'en',
                                mediaUrl: automation.media_url || null,
                                templateParameters,
                                to: lead.phone,
                                retryCount: 0
                            }
                        });
                    } catch (error) {
                        await Message.create({
                            content: messageBody,
                            type: 'SENT',
                            isBusiness: true,
                            leadId: lead.id,
                            deliveryStatus: 'failed',
                            messageOrigin: 'automation',
                            deliveryError: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Template send failed.',
                            metadata: {
                                automationId: automation.id,
                                templateName: automation.template_name || automation.name,
                                language: automation.template_language || 'en',
                                mediaUrl: automation.media_url || null,
                                templateParameters,
                                providerError: error.response?.data || error.message
                            }
                        });
                        console.error('WhatsApp template send failed for automation:', automation.id, error.response?.data || error.message || error);
                        await IntegrationLog.create({
                            type: 'whatsapp_send',
                            message: error.response?.data?.message || error.message || 'WhatsApp send failed',
                            metadata: {
                                automationId: automation.id,
                                leadId: lead.id,
                                error: error.response?.data || error.message
                            },
                            clinicId: automation.clinic_id
                        });
                        continue;
                    }

                    await Execution.create({
                        automationId: automation.id,
                        leadId: lead.id,
                        message: messageBody
                    });
                    await Automation.incrementExecutions(automation.id);
                    await Lead.updateLastContacted(lead.id);

                    await Activity.create({
                        type: 'AUTOMATION_RUN',
                        description: `Automation "${automation.name}" queued for ${lead.name}`,
                        userId: adminId,
                        leadId: lead.id
                    });

                    await Notification.create({
                        type: 'system',
                        title: 'Automation queued',
                        message: `Automation "${automation.name}" queued WhatsApp message for ${lead.name}.`,
                        priority: 'low',
                        actionLabel: 'View lead',
                        actionLink: `/leads/${lead.id}`,
                        metadata: {
                            leadId: lead.id,
                            leadName: lead.name,
                            automationId: automation.id,
                            automationName: automation.name
                        },
                        userId: adminId,
                        clinicId: automation.clinic_id
                    });
                }
            }

            // Update success rate
            await Automation.updateSuccessRate(automation.id);
        } catch (error) {
            console.error('Error processing automation:', error);
            await IntegrationLog.create({
                type: 'automation_process',
                message: error.message || 'Automation processing error',
                metadata: {
                    automationId: automation.id,
                    stack: error.stack
                },
                clinicId: automation.clinic_id
            });
        }
    }

    getPersonalizationMap(lead) {
        return {
            name: lead.name || '',
            service: lead.service || '',
            appointment_date: lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString('en-US') : '',
            phone: lead.phone || '',
            email: lead.email || ''
        };
    }

    renderAutomationMessage(automation, lead) {
        if (!automation.message) {
            return '';
        }
        const map = this.getPersonalizationMap(lead);
        return automation.message.replace(/\{(\w+)\}/g, (_match, token) => {
            const key = token.toLowerCase();
            return (map[key] || '').trim();
        }).replace(/\s+/g, ' ').trim();
    }

    buildTemplateParameters(personalization, lead) {
        const map = this.getPersonalizationMap(lead);
        const tokens = Array.isArray(personalization) && personalization.length
            ? personalization
            : ['name'];

        return tokens.map((token) => {
            const key = String(token || '').toLowerCase();
            return (map[key] || '').trim() || 'Customer';
        });
    }
}

module.exports = new CronJobs();
