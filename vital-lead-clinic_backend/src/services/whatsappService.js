const axios = require('axios');
const { query } = require('../config/database');
const WhatsAppSession = require('../models/WhatsAppSession');
const { sendMessage: sendWaWebBridgeMessage } = require('./waWebBridgeService');
const {
  META_CLOUD_PROVIDER,
  WA_WEB_PROVIDER,
  normalizeWhatsAppProvider,
  isMetaCloudProvider,
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
    provider: normalizeWhatsAppProvider(whatsapp.provider)
  };
};

const getWhatsAppProviderForClinic = async (clinicId) => {
  const config = await getClinicWhatsappConfig(clinicId);
  return normalizeWhatsAppProvider(config.provider);
};

const normalizePhone = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(/\D/g, '');
};

const normalizeLanguageCode = (value) => {
  const normalized = trimValue(value);
  if (!normalized) return 'en_US';

  const lower = normalized.toLowerCase();
  if (lower === 'en') return 'en_US';
  if (lower === 'he') return 'he_IL';
  if (lower === 'ar') return 'ar';

  return normalized;
};

const ensureMetaCredentials = (creds) => {
  if (!creds.phoneNumberId) {
    throw new Error('WhatsApp phone number ID is missing');
  }

  if (!creds.accessToken) {
    throw new Error('WhatsApp Cloud API access token is missing');
  }
};

const resolveMetaCloudCredentials = async (clinicId) => {
  const clinicWhatsapp = await getClinicWhatsappConfig(clinicId);
  const credentials = {
    provider: META_CLOUD_PROVIDER,
    cellactApiUser: trimValue(clinicWhatsapp.cellactApiUser) || trimValue(process.env.CELLACT_API_USER),
    cellactApiPassword: trimValue(clinicWhatsapp.cellactApiPassword) || trimValue(process.env.CELLACT_API_PASSWORD),
    cellactAppId: trimValue(clinicWhatsapp.cellactAppId) || trimValue(process.env.CELLACT_APP_ID),
    phoneNumberId:
      trimValue(clinicWhatsapp.waPhoneNumberId) ||
      trimValue(process.env.WA_PHONE_NUMBER_ID) ||
      trimValue(process.env.WHATSAPP_PHONE_NUMBER_ID),
    businessAccountId:
      trimValue(clinicWhatsapp.waBusinessAccountId) ||
      trimValue(process.env.WA_BUSINESS_ACCOUNT_ID) ||
      trimValue(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    accessToken:
      trimValue(clinicWhatsapp.cloudApiAccessToken) ||
      trimValue(process.env.CLOUD_API_ACCESS_TOKEN) ||
      trimValue(process.env.WHATSAPP_ACCESS_TOKEN),
    displayPhoneNumber:
      trimValue(clinicWhatsapp.displayPhoneNumber) ||
      trimValue(clinicWhatsapp.sender) ||
      trimValue(clinicWhatsapp.whatsappFrom),
    verifiedName: trimValue(clinicWhatsapp.verifiedName),
    graphBase: trimValue(process.env.WHATSAPP_GRAPH_BASE) || 'https://graph.facebook.com',
    apiVersion: trimValue(process.env.WHATSAPP_API_VERSION) || 'v22.0'
  };

  ensureMetaCredentials(credentials);
  return credentials;
};

const createGraphClient = (credentials) =>
  axios.create({
    baseURL: `${credentials.graphBase.replace(/\/$/, '')}/${credentials.apiVersion}`,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

const inferMediaType = (mediaUrl) => {
  const normalized = (mediaUrl || '').toLowerCase();
  if (!normalized) return null;
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(normalized)) return 'image';
  if (/\.(mp4|mov|avi|mkv)(\?|$)/.test(normalized)) return 'video';
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/.test(normalized)) return 'audio';
  return 'document';
};

const buildTextParameters = (templateParameters = []) => {
  if (!Array.isArray(templateParameters) || !templateParameters.length) {
    return [];
  }

  return templateParameters
    .map((value) => trimValue(String(value)))
    .filter(Boolean)
    .map((text) => ({
      type: 'text',
      text
    }));
};

const buildTemplateComponents = ({ templateParameters = [], mediaUrl }) => {
  const payloadComponents = [];
  const bodyParameters = buildTextParameters(templateParameters);

  if (bodyParameters.length) {
    payloadComponents.push({
      type: 'body',
      parameters: bodyParameters
    });
  }

  if (mediaUrl) {
    const mediaType = inferMediaType(mediaUrl);
    payloadComponents.push({
      type: 'header',
      parameters: [
        {
          type: mediaType,
          [mediaType]: {
            link: mediaUrl
          }
        }
      ]
    });
  }

  return payloadComponents;
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

async function sendMetaTemplateMessage({
  to,
  templateName,
  language,
  components = [],
  mediaUrl,
  body,
  clinicId,
  templateParameters = []
}) {
  if (!templateName) {
    throw new Error('Template name is required');
  }

  const credentials = await resolveMetaCloudCredentials(clinicId);
  const client = createGraphClient(credentials);
  const recipient = normalizePhone(to);

  if (!recipient) {
    throw new Error('Phone number is required for WhatsApp messages');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: normalizeLanguageCode(language)
      }
    }
  };

  const payloadComponents = Array.isArray(components) && components.length
    ? components
    : buildTemplateComponents({ templateParameters, mediaUrl });
  if (payloadComponents.length) {
    payload.template.components = payloadComponents;
  }

  try {
    const response = await client.post(`/${credentials.phoneNumberId}/messages`, payload);
    return response.data;
  } catch (error) {
    console.error('WhatsApp template send failed', {
      to: recipient,
      templateName,
      language,
      body,
      error: error.response?.data || error.message || error
    });
    throw error;
  }
}

async function sendMetaFreeTextMessage({
  to,
  body,
  mediaUrl,
  clinicId
}) {
  if (!body && !mediaUrl) {
    throw new Error('Message body or media URL is required');
  }

  const credentials = await resolveMetaCloudCredentials(clinicId);
  const client = createGraphClient(credentials);
  const recipient = normalizePhone(to);

  if (!recipient) {
    throw new Error('Phone number is required for WhatsApp messages');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient
  };

  if (mediaUrl) {
    const mediaType = inferMediaType(mediaUrl);
    payload.type = mediaType;
    payload[mediaType] = {
      link: mediaUrl,
      ...(body ? { caption: String(body).trim() } : {})
    };
  } else {
    payload.type = 'text';
    payload.text = {
      body: String(body).trim(),
      preview_url: false
    };
  }

  const response = await client.post(`/${credentials.phoneNumberId}/messages`, payload);
  return response.data;
}

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
  const provider = await getWhatsAppProviderForClinic(payload.clinicId);

  if (isWaWebProvider(provider)) {
    return sendWaWebMessage(payload);
  }

  return sendMetaTemplateMessage(payload);
}

async function sendWhatsAppMessage({
  to,
  body,
  mediaUrl,
  clinicId,
  contentSid = null,
  requiresTemplate = false
}) {
  const provider = await getWhatsAppProviderForClinic(clinicId);

  if (isMetaCloudProvider(provider) && (requiresTemplate || contentSid)) {
    throw new Error('Template sends must use sendTemplateMessage with an approved template name');
  }

  if (isWaWebProvider(provider)) {
    return sendWaWebMessage({ to, body, mediaUrl, clinicId });
  }

  return sendMetaFreeTextMessage({ to, body, mediaUrl, clinicId });
}

async function submitTemplateForApproval({
  clinicId,
  templateName,
  message
}) {
  if (!templateName || !message) {
    return null;
  }

  const provider = await getWhatsAppProviderForClinic(clinicId);
  if (isWaWebProvider(provider)) {
    return {
      contentSid: null,
      approvalSid: null,
      status: 'approved'
    };
  }

  return {
    contentSid: null,
    approvalSid: null,
    status: 'pending'
  };
}

async function refreshTemplateApprovalStatus({ clinicId }) {
  const provider = await getWhatsAppProviderForClinic(clinicId);
  if (isWaWebProvider(provider)) {
    return {
      contentSid: null,
      approvalSid: null,
      status: 'approved'
    };
  }

  return null;
}

const isMetaCloudConfiguredForClinic = async (clinicId) => {
  try {
    await resolveMetaCloudCredentials(clinicId);
    return true;
  } catch (_error) {
    return false;
  }
};

const isWaWebConfiguredForClinic = async (clinicId) => {
  const session = await WhatsAppSession.findByClinicId(clinicId);
  return Boolean(session && session.status === 'connected');
};

const isWhatsAppConfiguredForClinic = async (clinicId) => {
  const provider = await getWhatsAppProviderForClinic(clinicId);
  if (isWaWebProvider(provider)) {
    return isWaWebConfiguredForClinic(clinicId);
  }
  return isMetaCloudConfiguredForClinic(clinicId);
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
  getClinicWhatsappConfig,
  normalizeLanguageCode
};
