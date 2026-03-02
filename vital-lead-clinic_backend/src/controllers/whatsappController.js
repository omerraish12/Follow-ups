const { sendTemplateMessage } = require('../services/whatsappService');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Execution = require('../models/Execution');
const Automation = require('../models/Automation');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { getClinicAdminId } = require('../utils/clinicHelpers');

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

const normalizePhone = (value) => (value || '').replace(/[^0-9+]/g, '');

const handleWebhook = async (req, res) => {
  try {
    const entries = req.body?.entry || [];
    console.log("received message", entries);

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};

        // Incoming messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const from = normalizePhone(msg.from);
            const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title;
            if (!from || !text) continue;

            const lead = await Lead.findByPhone(from);
            if (lead) {
              await Message.create({
                content: text,
                type: 'RECEIVED',
                isBusiness: false,
                leadId: lead.id
              });

              const pendingExecution = await Execution.findPendingByLead(lead.id);
              if (pendingExecution) {
                await Execution.markReplied(pendingExecution.id);
                await Automation.incrementReplyCount(pendingExecution.automation_id);
                await Automation.updateSuccessRate(pendingExecution.automation_id);

                const adminId = await getClinicAdminId(lead.clinic_id);
                await Lead.update(lead.id, lead.clinic_id, {
                  status: 'HOT',
                  lastContacted: new Date()
                });
                await Notification.create({
                  type: 'lead',
                  title: 'WhatsApp reply received',
                  message: `${lead.name} replied to your automation.`,
                  priority: 'high',
                  actionLabel: 'View lead',
                  actionLink: `/leads/${lead.id}`,
                  metadata: {
                    leadId: lead.id,
                    automationId: pendingExecution.automation_id
                  },
                  userId: adminId,
                  clinicId: lead.clinic_id
                });
                await Activity.create({
                  type: 'MESSAGE_RECEIVED',
                  description: `Reply from ${lead.name}: ${text
                    .substring(0, 80)}`,
                  userId: adminId,
                  leadId: lead.id
                });
              }
            }
          }
        }

        // Delivery / status events could be stored similarly; omitted for brevity
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    await IntegrationLog.create({
      type: 'webhook_error',
      message: error.message || 'WhatsApp webhook processing failed',
      metadata: {
        route: 'handleWebhook',
        payloadSummary: Array.isArray(entries) ? entries.length : 0,
        error: error.stack || error.message
      }
    });
    res.sendStatus(500);
  }
};

const sendTemplate = async (req, res, next) => {
  try {
    const { to, templateName, language, components } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ message: 'to and templateName are required' });
    }
    const response = await sendTemplateMessage({ to, templateName, language, components });

    // Persist outbound marker if lead exists
    const lead = await Lead.findByPhone(to);
    if (lead) {
      await Message.create({
        content: `Template: ${templateName}`,
        type: 'OUTGOING',
        isBusiness: true,
        leadId: lead.id
      });
    }

    res.json({ success: true, response });
  } catch (error) {
    console.error('WhatsApp sendTemplate error:', error.response?.data || error.message);
    await IntegrationLog.create({
      type: 'twilio_send',
      message: error.response?.data?.message || error.message || 'Twilio sendTemplate API error',
      metadata: {
        to: req.body?.to,
        templateName: req.body?.templateName,
        error: error.response?.data || error.message
      },
      clinicId: req.user?.clinic_id
    });
    next(error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  sendTemplate,
};
