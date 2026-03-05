const { sendTemplateMessage } = require('../services/whatsappService');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Execution = require('../models/Execution');
const Automation = require('../models/Automation');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { getClinicAdminId } = require('../utils/clinicHelpers');
const { query } = require('../config/database');

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

const processInboundMessage = async (rawFrom, rawText) => {
  console.log("processInboundMessage called");
  const from = normalizePhone(rawFrom);
  const text = rawText?.trim();
  if (!from || !text) {
    return;
  }

  console.info('Inbound WhatsApp message', { from, text, receivedAt: new Date().toISOString() });

  const lead = await Lead.findByPhone(from);
  if (!lead) {
    console.info('Ignoring inbound WhatsApp message because no lead matches', { from, text });
    return;
  }

  await Message.create({
    content: text,
    type: 'RECEIVED',
    isBusiness: false,
    leadId: lead.id
  });

  const pendingExecution = await Execution.findPendingByLead(lead.id);
  console.log('pendingExecution: ', pendingExecution, lead.id);
  if (!pendingExecution?.id) {
    console.info('Inbound WhatsApp message ignored because no automation is awaiting a reply', {
      leadId: lead.id,
      clinicId: lead.clinic_id,
      text
    });
    await Lead.update(lead.id, lead.clinic_id, {
      lastContacted: new Date(),
      lastInboundMessageAt: new Date()
    });
    return;
  }
  console.log("____doing something____");

  await Execution.markReplied(pendingExecution.id);
  await Automation.incrementReplyCount(pendingExecution.automation_id);
  await Automation.updateSuccessRate(pendingExecution.automation_id);

  const adminId = await getClinicAdminId(lead.clinic_id);
  await Lead.update(lead.id, lead.clinic_id, {
    status: 'HOT',
    lastContacted: new Date(),
    lastInboundMessageAt: new Date()
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
    description: `Reply from ${lead.name}: ${text.substring(0, 80)}`,
    userId: adminId,
    leadId: lead.id
  });

};

const handleWebhook = async (req, res) => {
  try {
    console.log('got webhook', {
      method: req.method,
      agent: req.headers['user-agent'],
      entryCount: Array.isArray(req.body?.entry) ? req.body.entry.length : 0
    });
    const entries = req.body?.entry || [];
    const twilioFrom = req.body?.From || req.body?.from;
    const twilioBody = req.body?.Body || req.body?.body;
    const isTwilio = Boolean(twilioBody && twilioFrom && !entries.length);
    if (isTwilio) {
      await processInboundMessage(twilioFrom, twilioBody);
    } else {
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};

          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title;
              console.log('text', text);
              await processInboundMessage(msg.from, text);
            }
          }
        }
      }
    }

    res.status(200).end();
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    await IntegrationLog.create({
      type: 'webhook_error',
      message: error.message || 'WhatsApp webhook processing failed',
      metadata: {
        route: 'handleWebhook',
        payloadSummary: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
        error: error.stack || error.message
      }
    });
    res.status(500).end();
  }
};

const getLatestLeadMessageTimestamp = async (req, res) => {
  try {
    const result = await query(
      `SELECT MAX(m.timestamp) AS last_message_at
       FROM messages m
       JOIN leads l ON m.lead_id = l.id
       WHERE l.clinic_id = $1`,
      [req.user.clinic_id]
    );
    const lastMessageAt = result.rows?.[0]?.last_message_at || null;
    res.json({ last_message_at: lastMessageAt });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch latest message timestamp.' });
  }
};

const getSenderInfo = async (req, res) => {
  try {
    const clinicResult = await query(
      `SELECT whatsapp_number, integration_settings FROM clinics WHERE id = $1`,
      [req.user.clinic_id]
    );
    const clinic = clinicResult.rows?.[0] || {};
    const integrations = clinic.integration_settings || {};
    const whatsapp = integrations.whatsapp || {};
    const hasCredentials = Boolean(
      whatsapp.accountSid &&
      whatsapp.authToken &&
      (whatsapp.whatsappFrom || whatsapp.messagingServiceSid)
    );
    const status = hasCredentials ? 'connected' : 'disconnected';
    const displayNumber = whatsapp.whatsappFrom || clinic.whatsapp_number || null;

    res.json({
      provider: 'twilio',
      sender: displayNumber,
      displayNumber,
      status,
      message: displayNumber
        ? 'Patients and staff use this clinic WhatsApp number for chat.'
        : 'Add a clinic WhatsApp number in Settings > General to show it here.'
    });
  } catch (error) {
    console.error('Unable to load WhatsApp sender info:', error);
    res.status(500).json({ message: 'Unable to load WhatsApp sender info.' });
  }
};

const sendTemplate = async (req, res, next) => {
  try {
    const { to, templateName, language, components } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ message: 'to and templateName are required' });
    }
    const response = await sendTemplateMessage({
      to,
      templateName,
      language,
      components,
      clinicId: req.user?.clinic_id
    });

    // Persist outbound marker if lead exists
    const lead = await Lead.findByPhone(to);
    if (lead) {
      await Message.create({
        content: `Template: ${templateName}`,
        type: 'SENT',
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

const FAQ_ITEMS = [
  {
    id: 'automation',
    questionKey: 'whatsapp_faq_question_automation',
    answerKey: 'whatsapp_faq_answer_automation'
  },
  {
    id: 'templates',
    questionKey: 'whatsapp_faq_question_templates',
    answerKey: 'whatsapp_faq_answer_templates'
  },
  {
    id: 'editTemplates',
    questionKey: 'whatsapp_faq_question_edit',
    answerKey: 'whatsapp_faq_answer_edit'
  },
  {
    id: 'twilioSender',
    questionKey: 'whatsapp_faq_question_twilio',
    answerKey: 'whatsapp_faq_answer_twilio'
  }
];

const getFAQ = (req, res) => {
  res.json({
    faq: FAQ_ITEMS,
    updatedAt: new Date().toISOString()
  });
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  sendTemplate,
  getLatestLeadMessageTimestamp,
  getSenderInfo,
  getFAQ
};
