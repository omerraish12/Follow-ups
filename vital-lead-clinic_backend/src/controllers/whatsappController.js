const { sendTemplateMessage } = require('../services/whatsappService');
const aiReceptionist = require('../services/aiReceptionistService');
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

const parseComponentsValue = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse WhatsApp template components:', error);
    return [];
  }
};

const sendImmediateTemplateReply = async (rawTo, clinicId = null, options = {}) => {
  const templateName = options.templateName || process.env.TWILIO_IMMEDIATE_TEMPLATE_NAME;
  if (!templateName) {
    return;
  }

  const language = options.language || process.env.TWILIO_IMMEDIATE_TEMPLATE_LANGUAGE || 'en';
  const components = options.components
    ? parseComponentsValue(options.components)
    : parseComponentsValue(process.env.TWILIO_IMMEDIATE_TEMPLATE_COMPONENTS);

  try {
    const response = await sendTemplateMessage({
      to: rawTo,
      templateName,
      language,
      components,
      clinicId
    });
    if (options.leadId) {
      try {
        await Message.create({
          content: `Template: ${templateName}`,
          type: 'OUTGOING',
          isBusiness: true,
          leadId: options.leadId
        });
      } catch (logError) {
        console.error('Failed to log automation template message:', logError);
      }
    }
    return response;
  } catch (error) {
    console.error('Immediate Twilio template send failed:', error.response?.data || error.message);
    await IntegrationLog.create({
      type: 'twilio_send',
      message: error.response?.data?.message || error.message || 'Immediate Twilio template error',
      metadata: {
        to: rawTo,
        templateName,
        language,
        leadId: options.leadId,
        error: error.response?.data || error.message
      },
      clinicId
    });
  }
};

const getTemplateOptionsFromAutomation = (automation) => {
  if (!automation) {
    return null;
  }
  const templateName = automation.template_name || automation.name;
  if (!templateName) {
    return null;
  }
  return {
    templateName,
    language: automation.template_language || 'en',
    components: parseComponentsValue(automation.components)
  };
};

const processInboundMessage = async (rawFrom, rawText) => {
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
  if (!pendingExecution) {
    await aiReceptionist.respondToMessage({
      lead,
      text,
      clinicId: lead.clinic_id
    });
    return;
  }

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

  const automation = await Automation.findById(pendingExecution.automation_id, lead.clinic_id);
  const automationTemplate = getTemplateOptionsFromAutomation(automation);
  await sendImmediateTemplateReply(rawFrom, lead.clinic_id, {
    ...(automationTemplate || {}),
    leadId: lead.id
  });
};

const handleWebhook = async (req, res) => {
  try {
    const entries = req.body?.entry || [];
    console.log(req.body);
    const isTwilio = Boolean(req.body?.Body && req.body?.From && !entries.length);

    if (isTwilio) {
      await processInboundMessage(req.body.From, req.body.Body);
    } else {
    for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};

          if (Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title;
              await processInboundMessage(msg.from, text);
            }
          }
        }
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
        payloadSummary: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
        error: error.stack || error.message
      }
    });
    res.sendStatus(500);
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
      `SELECT integration_settings
       FROM clinics
       WHERE id = $1`,
      [req.user?.clinic_id]
    );
    const whatsapp = clinicResult.rows?.[0]?.integration_settings?.whatsapp || {};
    const sender = whatsapp.whatsappFrom || whatsapp.sender || process.env.TWILIO_WHATSAPP_FROM || null;
    const messagingServiceSid = whatsapp.messagingServiceSid || process.env.TWILIO_MESSAGING_SERVICE_SID || null;

    res.json({
      provider: 'twilio',
      sender,
      messagingServiceSid,
      status: whatsapp.status || 'disconnected',
      message:
        'Messages are sent through Twilio on behalf of your clinic. Patients still see the clinic WhatsApp number (configured as the Twilio sender).',
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
