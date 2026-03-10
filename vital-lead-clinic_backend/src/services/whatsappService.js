const { query } = require('../config/database');
const WhatsAppSession = require('../models/WhatsAppSession');
const { sendMessage: sendWaWebBridgeMessage } = require('./waWebBridgeService');
const {
  WA_WEB_PROVIDER,
  normalizeWhatsAppProvider,
  isWaWebProvider
} = require('../utils/whatsappProvider');

const trimValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const getClinicIntegrationSettings = async (clinicId) => {
  if (!clinicId) {
    return {};
  }

  const result = await query(
    `SELECT integration_settings FROM clinics WHERE id = $1`,
    [clinicId]
  );

  return result.rows?.[0]?.integration_settings || {};
};

const getClinicWhatsappConfig = async (clinicId) => {
  const integrations = await getClinicIntegrationSettings(clinicId);
  const whatsapp = integrations.whatsapp || {};
  return {
    ...whatsapp,
    provider: WA_WEB_PROVIDER
  };
};

const getWhatsAppProviderForClinic = async () => WA_WEB_PROVIDER;

const normalizePhone = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(/\D/g, '');
};

const buildWaWebText = ({ body, templateName, templateParameters = [] }) => {
  const trimmedBody = trimValue(body);
  if (trimmedBody) {
    return trimmedBody;
  }

  const parameterText = buildTextParameters(templateParameters)
    .map((item) => item.text)
    .join(' ')
    .trim();

  return trimValue(parameterText) || trimValue(templateName) || '';
};

async function sendWaWebMessage({
  to,
  body,
  mediaUrl,
  clinicId,
  templateName,
  templateParameters = []
}) {
  const recipient = normalizePhone(to);
  if (!recipient) {
    throw new Error('Phone number is required for WhatsApp messages');
  }

  const session = await WhatsAppSession.findByClinicId(clinicId);
  if (!session || session.status !== 'connected') {
    throw new Error('WhatsApp Web session is not connected');
  }

  const text = buildWaWebText({ body, templateName, templateParameters });
  if (!text && !mediaUrl) {
    throw new Error('Message body or media URL is required');
  }

  return sendWaWebBridgeMessage({
    clinicId,
    to: recipient,
    body: text || null,
    mediaUrl: mediaUrl || null
  });
}

async function sendTemplateMessage(payload) {
  return sendWaWebMessage(payload);
}

async function sendWhatsAppMessage({
  to,
  body,
  mediaUrl,
  clinicId,
  contentSid = null,
  requiresTemplate = false
}) {
  if (requiresTemplate || contentSid) {
    throw new Error('Templates are not supported without the official API. Use sendTemplateMessage for wa_web text fallback.');
  }
  return sendWaWebMessage({ to, body, mediaUrl, clinicId });
}

async function submitTemplateForApproval({
  clinicId,
  templateName,
  message
}) {
  if (!templateName || !message) {
    return null;
  }

  return {
    contentSid: null,
    approvalSid: null,
    status: 'approved'
  };
}

async function refreshTemplateApprovalStatus({ clinicId }) {
  return {
    contentSid: null,
    approvalSid: null,
    status: 'approved'
  };
}

const isMetaCloudConfiguredForClinic = async (clinicId) => {
  return false;
};

const isWaWebConfiguredForClinic = async (clinicId) => {
  const session = await WhatsAppSession.findByClinicId(clinicId);
  return Boolean(session && session.status === 'connected');
};

const isWhatsAppConfiguredForClinic = async (clinicId) => {
  return isWaWebConfiguredForClinic(clinicId);
};

module.exports = {
  sendTemplateMessage,
  sendWhatsAppMessage,
  submitTemplateForApproval,
  refreshTemplateApprovalStatus,
  isWhatsAppConfiguredForClinic,
  isMetaCloudConfiguredForClinic,
  isWaWebConfiguredForClinic,
  getWhatsAppProviderForClinic,
  getClinicWhatsappConfig
};
