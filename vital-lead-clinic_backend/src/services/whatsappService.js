const twilio = require('twilio');
const { query } = require('../config/database');


const clinicClientCache = new Map();

const ensureCredentials = (creds) => {
  if (!creds.accountSid || !creds.authToken) {
    throw new Error('Twilio credentials missing (accountSid / authToken)');
  }
  if (!creds.whatsappFrom && !creds.messagingServiceSid) {
    throw new Error('Twilio WhatsApp sender missing (whatsappFrom or messagingServiceSid)');
  }
};

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
  const settings = result.rows?.[0]?.integration_settings;
  return settings || {};
};

const getClinicWhatsappConfig = async (clinicId) => {
  const integrations = await getClinicIntegrationSettings(clinicId);
  const whatsapp = integrations.whatsapp || {};
  return whatsapp;
};

const pickCredential = (clinicValue) => trimValue(clinicValue);

const resolveTwilioCredentials = async (clinicId) => {
  const clinicWhatsapp = await getClinicWhatsappConfig(clinicId);
  const credentials = {
    accountSid: pickCredential(clinicWhatsapp.accountSid),
    authToken: pickCredential(clinicWhatsapp.authToken),
    messagingServiceSid: pickCredential(clinicWhatsapp.messagingServiceSid),
    whatsappFrom: pickCredential(clinicWhatsapp.whatsappFrom)
  };
  console.log("_______correct clinic credentials___________: ", credentials.authToken, credentials.accountSid);
  ensureCredentials(credentials);
  return credentials;
};

const isWhatsAppConfiguredForClinic = async (clinicId) => {
  try {
    await resolveTwilioCredentials(clinicId);
    return true;
  } catch (error) {
    return false;
  }
};

const getCacheKey = (clinicId) =>
  clinicId ? `clinic-${clinicId}` : 'system';

const getTwilioClientForClinic = async (clinicId) => {
  const credentials = await resolveTwilioCredentials(clinicId);
  console.log("_______correct clinic credentials___________: ", credentials.authToken, credentials.accountSid);
  const cacheKey = getCacheKey(clinicId);
  const cached = clinicClientCache.get(cacheKey);
  if (cached && cached.accountSid === credentials.accountSid && cached.authToken === credentials.authToken) {
    return { client: cached.client, credentials };
  }
  const client = twilio(credentials.accountSid, credentials.authToken);
  clinicClientCache.set(cacheKey, {
    client,
    accountSid: credentials.accountSid,
    authToken: credentials.authToken
  });
  return { client, credentials };
};

const normalizePhone = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(/[^0-9+]/g, '');
};

const buildWhatsAppAddress = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) {
    throw new Error('Phone number is required for WhatsApp messages');
  }
  return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
};

const formatSenderAddress = (value) => {
  if (!value) {
    return null;
  }
  return buildWhatsAppAddress(value);
};

const buildMessagePayload = (toAddress, config = {}, additionalFields = {}) => {
  const payload = {
    to: toAddress,
    ...additionalFields
  };

  if (config.messagingServiceSid) {
    payload.messagingServiceSid = config.messagingServiceSid;
  }

  const formattedSender = formatSenderAddress(config.whatsappFrom);
  if (formattedSender) {
    payload.from = formattedSender;
  }

  return payload;
};

const normalizeComponents = (components = []) => {
  if (!Array.isArray(components)) {
    return [];
  }

  return components
    .map((component) => {
      if (typeof component === 'string') {
        return {
          type: 'body',
          parameters: [{ type: 'text', text: component }]
        };
      }

      if (component && typeof component === 'object') {
        return component;
      }

      return null;
    })
    .filter(Boolean);
};

const QUICK_REPLY_LIMIT = 3;
const TEMPLATE_VARIABLE_DEFAULTS = {
  name: 'Customer',
  service: 'Your booked service',
  appointment_date: 'your upcoming appointment'
};

const sanitizeIdentifier = (value, fallback) => {
  const cleaned = (value || fallback || '').toString().trim();
  if (!cleaned) {
    return fallback || 'option';
  }
  return cleaned.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
};

const sanitizeLabel = (value, fallback) => {
  const label = (value || fallback || '').toString().trim();
  return label ? label.slice(0, 40) : String(fallback || 'Option');
};

const buildQuickReplyActions = (components = []) => {
  return components
    .filter((component) => component && component.type === 'quick_reply')
    .slice(0, QUICK_REPLY_LIMIT)
    .map((component, index) => {
      const title = sanitizeLabel(component.title, `Option ${index + 1}`);
      const id = sanitizeIdentifier(component.payload, title);
      return {
        title,
        id
      };
    });
};

const buildQuickReplyTemplateComponents = (components = []) => {
  const actions = buildQuickReplyActions(components);
  return actions.map((action, index) => ({
    type: 'button',
    sub_type: 'quick_reply',
    index,
    parameters: [
      {
        type: 'payload',
        payload: action.id
      }
    ]
  }));
};

const buildTemplateVariables = (personalization = []) => {
  const variables = {};
  personalization?.forEach((token, idx) => {
    const key = String(idx + 1);
    const normalized = (token || '').toString().trim().toLowerCase();
    const defaultValue = TEMPLATE_VARIABLE_DEFAULTS[normalized] || token || `Value ${key}`;
    variables[key] = defaultValue;
  });
  if (!Object.keys(variables).length) {
    variables['1'] = TEMPLATE_VARIABLE_DEFAULTS.name;
  }
  return variables;
};

const normalizeApprovalStatus = (status) => {
  const normalized = (status || '').toString().toLowerCase();
  if (normalized.includes('approve')) {
    return 'approved';
  }
  if (normalized.includes('reject') || normalized.includes('fail')) {
    return 'rejected';
  }
  return 'pending';
};

const buildTemplatePayload = ({ templateName, language, components, mediaUrl }) => {
  if (!templateName) {
    return null;
  }

  const normalized = normalizeComponents(components);
  const baseComponents = normalized.filter((component) => component?.type !== 'quick_reply');
  const quickReplyComponents = buildQuickReplyTemplateComponents(normalized);
  const payloadComponents = [...baseComponents, ...quickReplyComponents];

  const payload = {
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: language || 'en'
      },
      components: payloadComponents
    }
  };

  if (mediaUrl) {
    payload.template.components.push({
      type: 'header',
      parameters: [
        {
          type: 'media',
          mediaUrl
        }
      ]
    });
  }

  return payload;
};

async function sendTemplateMessage({ to, templateName, language, components = [], mediaUrl, body, clinicId }) {
  const { client, credentials } = await getTwilioClientForClinic(clinicId);
  console.log("credentials, ", credentials);
  const toAddress = buildWhatsAppAddress(to);

  const templatePayload = buildTemplatePayload({ templateName, language, components, mediaUrl });
  const messagePayload = buildMessagePayload(
    toAddress,
    {
      messagingServiceSid: credentials.messagingServiceSid,
      whatsappFrom: credentials.whatsappFrom
    }
  );

  messagePayload.body = (body || `WhatsApp test template: ${templateName}` || ' ').trim();

  if (templatePayload) {
    messagePayload.type = templatePayload.type;
    messagePayload.template = templatePayload.template;
  }

  return client.messages.create(messagePayload);
}

async function sendWhatsAppMessage({
  to,
  body,
  mediaUrl,
  clinicId,
  contentSid = null,
  requiresTemplate = false
}) {
  if (requiresTemplate && !contentSid) {
    throw new Error('The 24-hour free-text window has closed; send a template using contentSid.');
  }
  if (!body && !mediaUrl && !contentSid) {
    throw new Error('Message body, contentSid, or media URL is required');
  }

  const { client, credentials } = await getTwilioClientForClinic(clinicId);
  const toAddress = buildWhatsAppAddress(to);
  const messageFields = contentSid
    ? { contentSid }
    : { body: body ? String(body).trim() : ' ' };

  const payload = buildMessagePayload(
    toAddress,
    {
      messagingServiceSid: credentials.messagingServiceSid,
      whatsappFrom: credentials.whatsappFrom
    },
    messageFields
  );

  if (contentSid) {
    payload.contentSid = contentSid;
  }

  if (mediaUrl) {
    payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  }

  console.log("___________client____________", client, client.messages.create, payload);
  return client.messages.create(payload);
}

async function submitTemplateForApproval({
  templateName,
  language,
  message,
  components = [],
  personalization = [],
  clinicId
}) {
  if (!templateName || !message) {
    return null;
  }

  const { client } = await getTwilioClientForClinic(clinicId);
  const contentPayload = {
    friendlyName: templateName,
    language: language || 'en',
    variables: buildTemplateVariables(personalization),
    types: {
      'twilio/text': {
        body: message
      }
    }
  };

  const quickReplyActions = buildQuickReplyActions(components);
  if (quickReplyActions.length) {
    contentPayload.types['twilio/quick-reply'] = {
      body: message,
      actions: quickReplyActions
    };
  }

  const content = await client.content.v1.contents.create(contentPayload);
  const approval = await client.content.v1.contents(content.sid).approvals.create({
    channel: 'whatsapp'
  });

  return {
    contentSid: content.sid,
    approvalSid: approval?.sid || null,
    status: normalizeApprovalStatus(approval?.status)
  };
}

async function refreshTemplateApprovalStatus({ clinicId, contentSid }) {
  if (!contentSid) {
    return null;
  }
  const { client } = await getTwilioClientForClinic(clinicId);
  const approvals = await client.content.v1.contents(contentSid).approvals.list({ limit: 5 });
  const latest = approvals?.[0];
  if (!latest) {
    return null;
  }
  return {
    contentSid,
    approvalSid: latest.sid || null,
    status: normalizeApprovalStatus(latest.status)
  };
}

module.exports = {
  sendTemplateMessage,
  sendWhatsAppMessage,
  submitTemplateForApproval,
  refreshTemplateApprovalStatus,
  isWhatsAppConfiguredForClinic
};
