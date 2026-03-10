const { sendTemplateMessage, getClinicWhatsappConfig } = require('../services/whatsappService');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Execution = require('../models/Execution');
const Automation = require('../models/Automation');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const WhatsAppSession = require('../models/WhatsAppSession');
const { getClinicAdminId } = require('../utils/clinicHelpers');
const { query } = require('../config/database');
const {
  connectSession: connectWaWebBridgeSession,
  getSessionStatus: getWaWebBridgeSessionStatus,
  disconnectSession: disconnectWaWebBridgeSession
} = require('../services/waWebBridgeService');
const {
  WA_WEB_PROVIDER,
  normalizeWhatsAppProvider,
  isWaWebProvider
} = require('../utils/whatsappProvider');

const normalizePhone = (value) => (value || '').replace(/[^0-9+]/g, '');
const extractProviderMessageId = (response) =>
  response?.messages?.[0]?.id || response?.messageId || null;

const loadClinicIntegrationSettings = async (clinicId) => {
  const result = await query(
    `SELECT integration_settings FROM clinics WHERE id = $1`,
    [clinicId]
  );

  return result.rows?.[0]?.integration_settings || {};
};

const saveClinicWhatsappIntegration = async (clinicId, patch = {}) => {
  const integrations = await loadClinicIntegrationSettings(clinicId);
  const currentWhatsapp = integrations.whatsapp || {};
  const nextWhatsapp = {
    ...currentWhatsapp,
    ...patch,
    provider: normalizeWhatsAppProvider(patch.provider || currentWhatsapp.provider || WA_WEB_PROVIDER),
    updatedAt: new Date().toISOString()
  };

  if (patch.status === 'connected') {
    nextWhatsapp.lastConnectedAt = new Date().toISOString();
  }

  const next = {
    ...integrations,
    whatsapp: nextWhatsapp
  };

  await query(
    `UPDATE clinics
     SET integration_settings = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [next, clinicId]
  );

  return nextWhatsapp;
};

const buildInboundMessagePayload = (msg = {}) => {
  const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '';
  if (text.trim()) {
    return {
      content: text.trim(),
      metadata: {}
    };
  }

  const mediaPayload = msg.image || msg.document || msg.audio || msg.video || null;
  if (!mediaPayload) {
    return { content: '', metadata: {} };
  }

  const mediaType = msg.type || 'document';
  const fileName = mediaPayload.filename || mediaPayload.caption || `${mediaType} attachment`;

  return {
    content: mediaPayload.caption || `[${mediaType}] ${fileName}`,
    metadata: {
      mediaType,
      mediaId: mediaPayload.id || null,
      mimeType: mediaPayload.mime_type || null,
      fileName,
      mediaCaption: mediaPayload.caption || null
    }
  };
};

const processInboundMessage = async (rawFrom, rawText, metadata = {}) => {
  const from = normalizePhone(rawFrom);
  const text = rawText?.trim() || '';
  const messagePreview = text || metadata?.fileName || metadata?.mediaCaption || 'media attachment';
  if (!from || (!text && !metadata?.mediaType)) {
    return;
  }

  console.info('Inbound WhatsApp message', { from, text: messagePreview, receivedAt: new Date().toISOString() });

  const lead = await Lead.findByPhone(from);
  if (!lead) {
    console.info('Ignoring inbound WhatsApp message because no lead matches', { from, text: messagePreview });
    return;
  }

  await Message.create({
    content: text || messagePreview,
    type: 'RECEIVED',
    isBusiness: false,
    leadId: lead.id,
    deliveryStatus: 'received',
    messageOrigin: 'patient',
    metadata
  });

  const pendingExecution = await Execution.findPendingByLead(lead.id);
  if (!pendingExecution?.id) {
    await Lead.update(lead.id, lead.clinic_id, {
      lastContacted: new Date(),
      lastInboundMessageAt: new Date()
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
    description: `Reply from ${lead.name}: ${messagePreview.substring(0, 80)}`,
    userId: adminId,
    leadId: lead.id
  });
};

const processDeliveryStatus = async (statusPayload) => {
  const providerMessageId = statusPayload?.id;
  const deliveryStatus = (statusPayload?.status || '').toLowerCase() || null;
  if (!providerMessageId || !deliveryStatus) {
    return;
  }

  const errorSummary = Array.isArray(statusPayload?.errors)
    ? statusPayload.errors.map((item) => item?.title || item?.message || '').filter(Boolean).join('; ')
    : null;

  await Message.updateDeliveryByProviderMessageId(providerMessageId, {
    deliveryStatus,
    deliveryError: errorSummary,
    metadata: {
      providerStatus: statusPayload
    }
  });
};

const handleBridgeEvent = async (req, res) => {
  try {
    const expectedSecret = (process.env.WA_WEB_BACKEND_SHARED_SECRET || '').trim();
    const incomingSecret = String(req.headers['x-bridge-secret'] || '').trim();
    if (expectedSecret && expectedSecret !== incomingSecret) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const eventType = String(req.body?.type || '').trim().toLowerCase();
    if (eventType === 'message.received') {
      await processInboundMessage(req.body?.from, req.body?.text, req.body?.metadata || {});
    } else if (eventType === 'message.status') {
      await processDeliveryStatus({
        id: req.body?.messageId,
        status: req.body?.status,
        errors: req.body?.errors
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Bridge event error:', error);
    await IntegrationLog.create({
      type: 'bridge_event',
      message: error.message || 'WA Web bridge event failed',
      metadata: {
        error: error.stack || error.message,
        type: req.body?.type || null
      }
    });
    return res.status(500).json({ message: 'Unable to process bridge event' });
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
  } catch (_error) {
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
    const provider = normalizeWhatsAppProvider();
    const session = await WhatsAppSession.findByClinicId(req.user.clinic_id);
    const status = session?.status || whatsapp.status || 'disconnected';
    const displayNumber = whatsapp.displayPhoneNumber || clinic.whatsapp_number || null;

    res.json({
      provider,
      sender: displayNumber,
      displayNumber,
      status,
      sessionStatus: session?.status || null,
      deviceJid: session?.device_jid || null,
      message: displayNumber
        ? 'Patients and staff use this clinic WhatsApp number for chat.'
        : 'Add a clinic WhatsApp number in Settings > General to show it here.'
    });
  } catch (error) {
    console.error('Unable to load WhatsApp sender info:', error);
    res.status(500).json({ message: 'Unable to load WhatsApp sender info.' });
  }
};

const sendTemplate = async (req, res) => {
  try {
    const { to, templateName, language, components, mediaUrl, templateParameters } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ message: 'to and templateName are required' });
    }
    const lead = await Lead.findByPhone(to);
    const response = await sendTemplateMessage({
      to,
      templateName,
      language,
      components,
      mediaUrl,
      templateParameters,
      clinicId: req.user?.clinic_id
    });

    let messageRecord = null;
    if (lead) {
      const providerMessageId = extractProviderMessageId(response);
      messageRecord = await Message.create({
        content: `Template: ${templateName}`,
        type: 'SENT',
        isBusiness: true,
        leadId: lead.id,
        providerMessageId,
        deliveryStatus: 'sent',
        messageOrigin: 'template',
        metadata: {
          templateName,
          language,
          mediaUrl: mediaUrl || null,
          templateParameters: Array.isArray(templateParameters) ? templateParameters : [],
          components: Array.isArray(components) ? components : []
        }
      });
    }

    res.json({ success: true, response, messageRecord });
  } catch (error) {
    console.error('WhatsApp sendTemplate error:', error.response?.data || error.message);
    const lead = req.body?.to ? await Lead.findByPhone(req.body.to) : null;
    let messageRecord = null;
    if (lead && req.body?.templateName) {
      messageRecord = await Message.create({
        content: `Template: ${req.body.templateName}`,
        type: 'SENT',
        isBusiness: true,
        leadId: lead.id,
        deliveryStatus: 'failed',
        messageOrigin: 'template',
        deliveryError: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Template send failed.',
        metadata: {
          templateName: req.body.templateName,
          language: req.body.language,
          mediaUrl: req.body.mediaUrl || null,
          templateParameters: Array.isArray(req.body.templateParameters) ? req.body.templateParameters : [],
          components: Array.isArray(req.body.components) ? req.body.components : [],
          providerError: error.response?.data || error.message
        }
      });
    }
    await IntegrationLog.create({
      type: 'whatsapp_send',
      message: error.response?.data?.message || error.message || 'WhatsApp sendTemplate API error',
      metadata: {
        to: req.body?.to,
        templateName: req.body?.templateName,
        error: error.response?.data || error.message
      },
      clinicId: req.user?.clinic_id
    });
    return res.status(error.response?.status || 502).json({
      message: error.response?.data?.message || error.message || 'WhatsApp sendTemplate API error',
      messageRecord
    });
  }
};

const connectSession = async (req, res) => {
  try {
    await saveClinicWhatsappIntegration(req.user.clinic_id, {
      provider: WA_WEB_PROVIDER,
      status: 'connecting'
    });

    const response = await connectWaWebBridgeSession(req.user.clinic_id);
    const session = await WhatsAppSession.upsert(req.user.clinic_id, {
      provider: WA_WEB_PROVIDER,
      status: response?.status || 'connecting',
      qrCode: response?.qrCode || null,
      lastError: null
    });

    return res.json({
      provider: WA_WEB_PROVIDER,
      ...response,
      session
    });
  } catch (error) {
    await WhatsAppSession.upsert(req.user.clinic_id, {
      provider: WA_WEB_PROVIDER,
      status: 'disconnected',
      lastError: error.response?.data?.message || error.message || 'Unable to connect WhatsApp Web session'
    });
    return res.status(error.response?.status || 502).json({
      message: error.response?.data?.message || error.message || 'Unable to connect WhatsApp Web session'
    });
  }
};

const getSessionStatus = async (req, res) => {
  try {
    let bridgeStatus = null;
    try {
      bridgeStatus = await getWaWebBridgeSessionStatus(req.user.clinic_id);
    } catch (_error) {
      bridgeStatus = null;
    }

    if (bridgeStatus) {
      await WhatsAppSession.upsert(req.user.clinic_id, {
        provider: WA_WEB_PROVIDER,
        status: bridgeStatus.status,
        qrCode: bridgeStatus.qrCode,
        deviceJid: bridgeStatus.deviceJid,
        lastConnectedAt: bridgeStatus.lastConnectedAt || null,
        lastError: bridgeStatus.lastError || null
      });
    }

    const session = await WhatsAppSession.findByClinicId(req.user.clinic_id);
    const config = await getClinicWhatsappConfig(req.user.clinic_id);

    return res.json({
      provider: normalizeWhatsAppProvider(config.provider),
      session: session || null
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Unable to load WhatsApp session status'
    });
  }
};

const getSessionQr = async (req, res) => {
  try {
    const session = await WhatsAppSession.findByClinicId(req.user.clinic_id);
    return res.json({
      provider: WA_WEB_PROVIDER,
      qrCode: session?.qr_code || null,
      status: session?.status || 'disconnected'
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Unable to load WhatsApp QR code'
    });
  }
};

const disconnectSession = async (req, res) => {
  try {
    try {
      await disconnectWaWebBridgeSession(req.user.clinic_id);
    } catch (_error) {
      // Continue and clear local state even if the bridge is already gone.
    }

    await WhatsAppSession.clearForClinic(req.user.clinic_id);
    await saveClinicWhatsappIntegration(req.user.clinic_id, {
      provider: WA_WEB_PROVIDER,
      status: 'disconnected'
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Unable to disconnect WhatsApp Web session'
    });
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
    id: 'providerSender',
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
  handleBridgeEvent,
  processInboundMessage,
  sendTemplate,
  getLatestLeadMessageTimestamp,
  getSenderInfo,
  connectSession,
  getSessionStatus,
  getSessionQr,
  disconnectSession,
  getFAQ
};
