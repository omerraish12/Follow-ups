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

const normalizeComponents = (components = []) => {
  if (!Array.isArray(components)) {
    return [];
  }

  return components.map((component) => {
    if (typeof component === "string") {
      return {
        type: "body",
        parameters: [{ type: "text", text: component }]
      };
    }

    if (component && typeof component === "object") {
      return component;
    }

    return null;
  }).filter(Boolean);
};

const buildTemplatePayload = ({ templateName, language, components, mediaUrl }) => {
  if (!templateName) {
    return null;
  }

  const payload = {
    type: "template",
    template: {
      name: templateName,
      language: {
        code: language || "en"
      },
      components: normalizeComponents(components)
    }
  };

  if (mediaUrl) {
    payload.template.components.push({
      type: "header",
      parameters: [
        {
          type: "media",
          mediaUrl
        }
      ]
    });
  }

  return payload;
};

async function sendTemplateMessage({ to, templateName, language, components = [], mediaUrl, body }) {
  const client = getTwilioClient();
  const toAddress = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const templatePayload = buildTemplatePayload({ templateName, language, components, mediaUrl });
  const messagePayload = {
    to: toAddress
  };

  if (templatePayload) {
    messagePayload.content = [templatePayload];
  } else {
    messagePayload.body = (body || templateName || " ").trim();
  }

  if (messagingServiceSid) {
    messagePayload.messagingServiceSid = messagingServiceSid;
  } else {
    messagePayload.from = whatsappFrom;
  }

  return client.messages.create(messagePayload);
}

module.exports = {
  sendTemplateMessage
};
