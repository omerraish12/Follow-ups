const twilio = require('twilio');
const { query } = require('../config/database');

const DEFAULT_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const DEFAULT_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const DEFAULT_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || '';
const DEFAULT_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

const clinicClientCache = new Map();

const getClinicTwilioSettings = async (clinicId) => {
  if (!clinicId) {
    return null;
  }
  const result = await query(
    `SELECT integration_settings
     FROM clinics
     WHERE id = $1`,
    [clinicId]
  );
  const whatsapp = result.rows?.[0]?.integration_settings?.whatsapp || {};
  return {
    accountSid: whatsapp.accountSid || null,
    authToken: whatsapp.authToken || null,
    messagingServiceSid: whatsapp.messagingServiceSid || null,
    whatsappFrom: whatsapp.whatsappFrom || whatsapp.sender || null
  };
};

const ensureCredentials = (creds) => {
  if (!creds.accountSid || !creds.authToken) {
    throw new Error('Twilio credentials missing (accountSid / authToken)');
  }
  if (!creds.whatsappFrom && !creds.messagingServiceSid) {
    throw new Error('Twilio WhatsApp sender missing (whatsappFrom or messagingServiceSid)');
  }
};

const resolveTwilioCredentials = async (clinicId) => {
  const clinicSettings = await getClinicTwilioSettings(clinicId);
  const credentials = clinicSettings?.accountSid && clinicSettings?.authToken
    ? {
        accountSid: clinicSettings.accountSid,
        authToken: clinicSettings.authToken,
        messagingServiceSid: clinicSettings.messagingServiceSid || DEFAULT_MESSAGING_SERVICE_SID || null,
        whatsappFrom: clinicSettings.whatsappFrom || DEFAULT_WHATSAPP_FROM || null
      }
    : {
        accountSid: DEFAULT_ACCOUNT_SID || null,
        authToken: DEFAULT_AUTH_TOKEN || null,
        messagingServiceSid: DEFAULT_MESSAGING_SERVICE_SID || null,
        whatsappFrom: DEFAULT_WHATSAPP_FROM || null
      };
  ensureCredentials(credentials);
  return credentials;
};

const getTwilioClientForClinic = async (clinicId) => {
  const credentials = await resolveTwilioCredentials(clinicId);
  const cacheKey = clinicId || 'default';
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

const buildMessagePayload = (toAddress, config = {}, additionalFields = {}) => {
  const payload = {
    to: toAddress,
    ...additionalFields
  };

  if (config.messagingServiceSid) {
    payload.messagingServiceSid = config.messagingServiceSid;
  } else if (config.whatsappFrom) {
    payload.from = config.whatsappFrom;
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

async function sendWhatsAppMessage({ to, body, mediaUrl, clinicId }) {
  if (!body && !mediaUrl) {
    throw new Error('Message body or media URL is required');
  }

  const { client, credentials } = await getTwilioClientForClinic(clinicId);
  console.log("send", to, body, mediaUrl);
  const toAddress = buildWhatsAppAddress(to);
  const payload = buildMessagePayload(
    toAddress,
    {
      messagingServiceSid: credentials.messagingServiceSid,
      whatsappFrom: credentials.whatsappFrom
    },
    {
      body: body ? String(body).trim() : ' '
    }
  );

  console.log("payload", payload);
  if (mediaUrl) {
    payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  }

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
  refreshTemplateApprovalStatus
};
