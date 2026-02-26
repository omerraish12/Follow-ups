const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

const assertConfig = () => {
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials missing (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)');
  }
};

async function sendTemplateMessage({ to, templateName, language = 'en_US', components = [] }) {
  assertConfig();

  const url = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${text}`);
  }

  return res.json();
}

module.exports = {
  sendTemplateMessage,
};
