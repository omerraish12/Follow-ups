const cron = require('node-cron');
const Automation = require('../models/Automation');
const Execution = require('../models/Execution');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { query } = require('../config/database');
const { sendTemplateMessage } = require('../services/whatsappService');
const { getClinicAdminId } = require('../utils/clinicHelpers');

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
            const adminId = await getClinicAdminId(automation.clinic_id);
            const triggerDays = Array.isArray(automation.trigger_days) ? automation.trigger_days : [3, 7, 14];

            for (const days of triggerDays) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - days);

                const leads = await query(
                    `SELECT l.* 
           FROM leads l
           WHERE l.clinic_id = $1 
             AND ($2::lead_status IS NULL OR l.status = $2::lead_status)
             AND COALESCE(l.last_contacted, l.created_at) <= $3
             AND NOT EXISTS (
               SELECT 1 FROM executions e 
               WHERE e.lead_id = l.id 
                 AND e.automation_id = $4
                 AND e.executed_at >= $3
             )`,
                    [automation.clinic_id, automation.target_status || null, targetDate, automation.id]
                );

                for (const lead of leads.rows) {
                    if (!lead.phone) {
                        continue;
                    }

                    const messageBody = this.renderAutomationMessage(automation, lead);
                    if (!messageBody) {
                        continue;
                    }

                    try {
                        await sendTemplateMessage({
                            to: lead.phone,
                            body: messageBody,
                            templateName: automation.template_name || automation.name,
                            language: automation.template_language || 'en',
                            components: automation.components || [],
                            mediaUrl: automation.media_url || undefined
                        });
                    } catch (error) {
                        console.error('Twilio sendTemplate failed for automation:', automation.id, error.response?.data || error.message || error);
                        await IntegrationLog.create({
                            type: 'twilio_send',
                            message: error.response?.data?.message || error.message || 'Twilio send failed',
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

                    await Message.create({
                        content: messageBody,
                        type: 'SENT',
                        isBusiness: true,
                        leadId: lead.id
                    });

                    await Automation.incrementExecutions(automation.id);
                    await Lead.updateLastContacted(lead.id);

                    await Activity.create({
                        type: 'AUTOMATION_RUN',
                        description: `Automation "${automation.name}" executed for lead ${lead.name}`,
                        userId: adminId,
                        leadId: lead.id
                    });

                    await Notification.create({
                        type: 'system',
                        title: 'Automation executed',
                        message: `Automation "${automation.name}" ran for lead ${lead.name}.`,
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
}

module.exports = new CronJobs();
