const { sendTemplateMessage, sendWhatsAppMessage, getClinicWhatsappConfig, isWhatsAppConfiguredForClinic } = require('../services/whatsappService');
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
const crypto = require('crypto');
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

const { normalizeToE164, getDefaultCountry } = require('../utils/phone');
const normalizePhone = (value) => normalizeToE164(value, getDefaultCountry());
const extractProviderMessageId = (response) =>
  response?.messages?.[0]?.id || response?.messageId || null;

const DEFAULT_WELCOME_TEMPLATE = {
  name: 'lead_welcome',
  language: 'en',
  body: 'Hi {name}, Thanks for contacting our clinic! A team member will reach out shortly.'
};

const firstNameOrDefault = (name) => {
  if (!name) return 'there';
  const first = String(name).trim().split(/\s+/)[0];
  return first || 'there';
};

const normalizeLeadStatus = (status) => {
  if (!status || typeof status !== 'string') return undefined;
  const allowed = new Set(['NEW', 'HOT', 'CLOSED', 'LOST']);
  const normalized = status.trim().toUpperCase();
  return allowed.has(normalized) ? normalized : undefined;
};

const loadClinicIntegrationSettings = async (clinicId) => {
  const result = await query(
    `SELECT integration_settings FROM clinics WHERE id = $1::int`,
    [clinicId]
  );

  return result.rows?.[0]?.integration_settings || {};
};

const resolveWelcomeTemplate = async (clinicId, fallbackName) => {
  const integrations = await loadClinicIntegrationSettings(clinicId);
  const welcome = integrations?.whatsapp?.welcomeTemplate || {};
  const nameToken = firstNameOrDefault(fallbackName);

  return {
    name: welcome.templateName || welcome.name || DEFAULT_WELCOME_TEMPLATE.name,
    language: welcome.language || DEFAULT_WELCOME_TEMPLATE.language,
    body: (welcome.body || DEFAULT_WELCOME_TEMPLATE.body).replace('{name}', nameToken),
    templateParameters: [nameToken]
  };
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
     SET integration_settings = $1::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2::int
     RETURNING integration_settings`,
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

const sendWelcomeForLead = async ({ lead, clinicId, greetingName, adminId }) => {
  if (!lead?.phone) {
    return null;
  }

  const whatsappConfigured = await isWhatsAppConfiguredForClinic(clinicId);
  if (!whatsappConfigured) {
    await IntegrationLog.create({
      type: 'whatsapp_send',
      message: 'Skipped welcome message because WhatsApp is not connected',
      metadata: { leadId: lead.id },
      clinicId
    });
    return null;
  }

  const template = await resolveWelcomeTemplate(clinicId, greetingName || lead.name);
  const templateParameters = template.templateParameters || [greetingName];
  const resolvedAdminId = adminId || (await getClinicAdminId(clinicId));

  try {
    const providerResponse = await sendTemplateMessage({
      to: lead.phone,
      body: template.body,
      templateName: template.name,
      language: template.language,
      templateParameters,
      clinicId
    });
    const providerMessageId = extractProviderMessageId(providerResponse);
    await Message.create({
      content: template.body,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      providerMessageId,
      deliveryStatus: 'sent',
      messageOrigin: 'automation',
      metadata: {
        templateName: template.name,
        language: template.language,
        templateParameters,
        automation: 'inbound_welcome'
      }
    });
    await Lead.updateLastContacted(lead.id);
    await Activity.create({
      type: 'MESSAGE_SENT',
      description: 'Sent automatic WhatsApp welcome message.',
      userId: resolvedAdminId,
      leadId: lead.id
    });
    return true;
  } catch (error) {
    await Message.create({
      content: template.body,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      deliveryStatus: 'failed',
      messageOrigin: 'automation',
      deliveryError: error.response?.data?.message || error.message || 'Failed to send welcome message.',
      metadata: {
        templateName: template.name,
        language: template.language,
        templateParameters,
        automation: 'inbound_welcome',
        providerError: error.response?.data || error.message
      }
    });
    await IntegrationLog.create({
      type: 'whatsapp_send',
      message: 'Automatic welcome message failed',
      metadata: {
        leadId: lead.id,
        templateName: template.name,
        error: error.response?.data || error.message
      },
      clinicId
    });
    return false;
  }
};

const processInboundMessage = async (rawFrom, rawText, metadata = {}, clinicId, contactName = null) => {
  const normalizedFrom = normalizePhone(rawFrom);
  const from = normalizedFrom || String(rawFrom || '').trim();
  const text = rawText?.trim() || '';
  const messagePreview = text || metadata?.fileName || metadata?.mediaCaption || 'media attachment';

  if (!normalizedFrom) {
    await IntegrationLog.create({
      type: 'whatsapp_inbound',
      message: 'Inbound sender could not be normalized (likely masked or privacy-protected ID).',
      clinicId,
      metadata: {
        rawFrom,
        contactName,
        text: messagePreview
      }
    });
  }

  if (!clinicId) {
    console.info('Inbound WhatsApp message skipped because clinicId is missing', { from, text: messagePreview });
    return;
  }

  if (!from || (!text && !metadata?.mediaType)) {
    return;
  }

  let lead = await Lead.findByPhone(from, clinicId);
  let adminId = await getClinicAdminId(clinicId);
  let leadWasCreated = false;

  if (!lead) {
    leadWasCreated = true;
    const createdName = contactName?.trim() || from;
    lead = await Lead.create({
      name: createdName,
      phone: from,
      service: 'WhatsApp inquiry',
      status: 'NEW',
      source: 'whatsapp_inbound',
      notes: text ? `First message: ${text}` : 'First WhatsApp message',
      clinicId,
      assignedToId: adminId
    });

    await Activity.create({
      type: 'LEAD_CREATED',
      description: `Lead created from WhatsApp: ${createdName}`,
      userId: adminId,
      leadId: lead.id
    });

    await Notification.create({
      type: 'lead',
      title: 'New WhatsApp lead',
      message: `${createdName} messaged the clinic on WhatsApp.`,
      priority: 'high',
      actionLabel: 'Open lead',
      actionLink: `/leads/${lead.id}`,
      metadata: { leadId: lead.id, source: 'whatsapp_inbound' },
      userId: adminId,
      clinicId
    });
  }

  console.info('Inbound WhatsApp message', { from, clinicId, text: messagePreview, receivedAt: new Date().toISOString() });

  // Auto-acknowledge every incoming message AND persist it to history
  const ackText = 'I got your message. I will respond asap!!!';
  try {
    const ackResp = await sendWhatsAppMessage({
      to: from,
      body: ackText,
      clinicId
    });
    const providerMessageId = extractProviderMessageId(ackResp);
    await Message.create({
      content: ackText,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      deliveryStatus: 'sent',
      messageOrigin: 'automation',
      providerMessageId,
      metadata: {
        automation: 'auto_ack',
        providerResponse: ackResp
      }
    });
    console.log('Auto-ack sent', { clinicId, to: from, providerResponse: ackResp });
  } catch (ackError) {
    console.error('Auto-ack send failed', ackError?.response?.data || ackError.message);
    await Message.create({
      content: ackText,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      deliveryStatus: 'failed',
      messageOrigin: 'automation',
      deliveryError: ackError?.response?.data || ackError.message,
      metadata: {
        automation: 'auto_ack',
        providerError: ackError?.response?.data || ackError.message
      }
    });
    await IntegrationLog.create({
      type: 'whatsapp_send',
      message: 'Auto-ack send failed',
      clinicId,
      metadata: {
        to: from,
        leadId: lead.id,
        error: ackError?.response?.data || ackError.message
      }
    });
  }

  const lower = text.toLowerCase();
  // Consent/opt-out handling removed: messages continue regardless.

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
  } else {
    await Execution.markReplied(pendingExecution.id);
    await Automation.incrementReplyCount(pendingExecution.automation_id);
    await Automation.updateSuccessRate(pendingExecution.automation_id);

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
  }

  if (leadWasCreated) {
    const greetingName = firstNameOrDefault(contactName || lead.name || from);
    await sendWelcomeForLead({
      lead,
      clinicId,
      greetingName,
      adminId
    });
  }
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

  const mappedStatus = ['sent', 'delivered', 'read', 'failed'].includes(deliveryStatus)
    ? deliveryStatus
    : deliveryStatus === 'error'
      ? 'failed'
      : 'sent';

  await Message.updateDeliveryByProviderMessageId(providerMessageId, {
    deliveryStatus: mappedStatus,
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
    const timestamp = Number(req.headers['x-bridge-timestamp'] || 0);
    const signature = String(req.headers['x-bridge-signature'] || '').trim();
    const now = Date.now();

    if (timestamp && Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return res.status(401).json({ message: 'Stale request' });
    }

    if (expectedSecret) {
      if (!incomingSecret || incomingSecret !== expectedSecret) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (signature) {
        const payload = JSON.stringify(req.body || {});
        const hmac = crypto.createHmac('sha256', expectedSecret);
        hmac.update(`${timestamp}.${payload}`);
        const expectedSig = hmac.digest('hex');
        if (expectedSig !== signature) {
          return res.status(401).json({ message: 'Invalid signature' });
        }
      }
    } else if (signature) {
      return res.status(401).json({ message: 'Signature not allowed without shared secret' });
    }

    if (expectedSecret && !timestamp) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const eventType = String(req.body?.type || '').trim().toLowerCase();
    if (eventType === 'message.received') {
      await processInboundMessage(
        req.body?.from,
        req.body?.text,
        req.body?.metadata || {},
        req.body?.clinicId,
        req.body?.contactName || null
      );
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
       WHERE l.clinic_id = $1::int`,
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
      `SELECT whatsapp_number, integration_settings FROM clinics WHERE id = $1::int`,
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
    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return res.status(400).json({ message: 'Invalid destination phone number' });
    }
    const lead = await Lead.findByPhone(to, req.user?.clinic_id);
    const response = await sendTemplateMessage({
      to: normalizedTo,
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
    const lead = req.body?.to ? await Lead.findByPhone(req.body.to, req.user?.clinic_id) : null;
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

// @desc    Backfill leads from past contacts and send follow-up message
// @route   POST /api/whatsapp/followups/backfill
const backfillFollowups = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const adminId = await getClinicAdminId(clinicId);
    const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    const rawStatus = req.body?.status;
    const desiredStatus = normalizeLeadStatus(rawStatus) || 'NEW';
    const rawMessage = (req.body?.message || '').toString().trim();
    if (!contacts.length) {
      return res.status(400).json({ message: 'contacts array is required' });
    }

    const results = [];

    for (const contact of contacts) {
      const phone = normalizePhone(contact.phone);
      if (!phone) {
        results.push({ phone: contact.phone || null, success: false, error: 'Invalid phone' });
        continue;
      }

      const name = (contact.name || '').trim() || phone;
      const service = (contact.service || 'Follow-up').trim();
      const source = (contact.source || 'backfill').trim();

      let lead = await Lead.findByPhone(phone, clinicId);
      if (!lead) {
        lead = await Lead.create({
          name,
          phone,
          service,
          status: desiredStatus,
          source,
          clinicId,
          assignedToId: adminId
        });
        await Activity.create({
          type: 'LEAD_CREATED',
          description: `Lead created from backfill: ${name}`,
          userId: adminId,
          leadId: lead.id
        });
      } else if (desiredStatus) {
        await Lead.update(lead.id, clinicId, { status: desiredStatus });
      }

      const greetingName = firstNameOrDefault(name);
      const fallbackMessage = `Hi ${greetingName}, we’re following up to see if you still need help with ${service}. Reply here and we’ll take care of you.`;
      const messageBody = rawMessage || fallbackMessage;

      try {
        const providerResponse = await sendWhatsAppMessage({
          to: phone,
          body: messageBody,
          clinicId
        });
        const providerMessageId = extractProviderMessageId(providerResponse);
        await Message.create({
          content: messageBody,
          type: 'SENT',
          isBusiness: true,
          leadId: lead.id,
          providerMessageId,
          deliveryStatus: 'sent',
          messageOrigin: 'backfill',
          metadata: {
            source: 'backfill_followup',
            service,
            status: desiredStatus
          }
        });
        await Lead.updateLastContacted(lead.id);
        await Activity.create({
          type: 'MESSAGE_SENT',
          description: `Backfill follow-up sent to ${lead.name}`,
          userId: adminId,
          leadId: lead.id
        });
        results.push({ phone, success: true, leadId: lead.id });
      } catch (error) {
        await Message.create({
          content: messageBody,
          type: 'SENT',
          isBusiness: true,
          leadId: lead.id,
          deliveryStatus: 'failed',
          messageOrigin: 'backfill',
          deliveryError: error.response?.data?.message || error.message || 'Failed to send follow-up',
          metadata: {
            source: 'backfill_followup',
            service,
            status: desiredStatus,
            providerError: error.response?.data || error.message
          }
        });
        results.push({
          phone,
          success: false,
          leadId: lead.id,
          error: error.response?.data?.message || error.message
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Backfill followups error:', error);
    res.status(500).json({ message: 'Unable to process backfill followups' });
  }
};

const connectSession = async (req, res) => {
  const clinicId = Number(req.user?.clinic_id);
  if (!Number.isFinite(clinicId)) {
    return res.status(400).json({ message: 'Invalid clinic id' });
  }
  try {

    await saveClinicWhatsappIntegration(clinicId, {
      provider: WA_WEB_PROVIDER,
      status: 'connecting'
    });

    const response = await connectWaWebBridgeSession(clinicId);
    const session = await WhatsAppSession.upsert(clinicId, {
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
    const safeClinicId = clinicId;
    if (safeClinicId) {
      await WhatsAppSession.upsert(safeClinicId, {
        provider: WA_WEB_PROVIDER,
        status: 'disconnected',
        lastError: error.response?.data?.message || error.message || 'Unable to connect WhatsApp Web session'
      });
    }
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
    // Clear stale config errors once the bridge URL exists, so the UI stops showing them.
    if (
      session?.last_error === 'WA_WEB_BRIDGE_URL is not configured' &&
      (process.env.WA_WEB_BRIDGE_URL || '').trim()
    ) {
      await WhatsAppSession.upsert(req.user.clinic_id, { lastError: null });
      session.last_error = null;
    }
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
  getFAQ,
  backfillFollowups
};
