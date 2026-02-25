const cron = require('node-cron');
const Automation = require('../models/Automation');
const Execution = require('../models/Execution');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { query } = require('../config/database');

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
                    const targetUserId = lead.assigned_to_id || (await this.getClinicAdmin(clinic.id));
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
            for (const days of automation.trigger_days) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - days);

                const leads = await query(
                    `SELECT l.* 
           FROM leads l
           WHERE l.clinic_id = $1 
             AND l.status = $2
             AND l.last_contacted <= $3
             AND NOT EXISTS (
               SELECT 1 FROM executions e 
               WHERE e.lead_id = l.id 
                 AND e.automation_id = $4
                 AND e.executed_at >= $3
             )`,
                    [automation.clinic_id, automation.target_status, targetDate, automation.id]
                );

                for (const lead of leads.rows) {
                    const adminId = await this.getClinicAdmin(automation.clinic_id);
                    // Record execution
                    await Execution.create({
                        automationId: automation.id,
                        leadId: lead.id,
                        message: automation.message
                    });

                    // Update automation stats
                    await Automation.incrementExecutions(automation.id);

                    // Log activity
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
        }
    }

    async getClinicAdmin(clinicId) {
        const result = await query(
            `SELECT id FROM users WHERE clinic_id = $1 AND role = 'ADMIN' LIMIT 1`,
            [clinicId]
        );
        return result.rows[0]?.id || null;
    }
}

module.exports = new CronJobs();
