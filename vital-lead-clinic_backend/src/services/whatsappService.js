const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

const ensureTwilioConfig = () => {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)');
  }
  if (!whatsappFrom && !messagingServiceSid) {
    throw new Error('Twilio WhatsApp sender missing (TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID)');
  }
};

let twilioClient;
const getTwilioClient = () => {
  ensureTwilioConfig();
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
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

const buildMessagePayload = (toAddress, additionalFields = {}) => {
  const payload = {
    to: toAddress,
    ...additionalFields
  };

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  } else {
    payload.from = whatsappFrom;
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

const buildTemplatePayload = ({ templateName, language, components, mediaUrl }) => {
  if (!templateName) {
    return null;
  }

  const payload = {
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: language || 'en'
      },
      components: normalizeComponents(components)
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

async function sendTemplateMessage({ to, templateName, language, components = [], mediaUrl, body }) {
  const client = getTwilioClient();
  const toAddress = buildWhatsAppAddress(to);

  const templatePayload = buildTemplatePayload({ templateName, language, components, mediaUrl });
  const messagePayload = buildMessagePayload(toAddress, {});

  messagePayload.body = (body || `WhatsApp test template: ${templateName}` || ' ').trim();

  if (templatePayload) {
    messagePayload.type = templatePayload.type;
    messagePayload.template = templatePayload.template;
  }

  return client.messages.create(messagePayload);
}

async function sendWhatsAppMessage({ to, body, mediaUrl }) {
  if (!body && !mediaUrl) {
    throw new Error('Message body or media URL is required');
  }

  const client = getTwilioClient();
  console.log("send", to, body, mediaUrl);
  const toAddress = buildWhatsAppAddress(to);
  const payload = buildMessagePayload(toAddress, {
    body: body ? String(body).trim() : ' '
  });

  console.log("payload", payload);
  if (mediaUrl) {
    payload.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
  }

  return client.messages.create(payload);
}

module.exports = {
  sendTemplateMessage,
  sendWhatsAppMessage
};
