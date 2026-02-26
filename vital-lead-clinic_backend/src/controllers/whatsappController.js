const { sendTemplateMessage } = require('../services/whatsappService');
const Lead = require('../models/Lead');
const Message = require('../models/Message');

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

const handleWebhook = async (req, res) => {
  try {
    const entries = req.body?.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};

        // Incoming messages
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const from = normalizePhone(msg.from);
            const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title;
            if (!from || !text) continue;

            const lead = await Lead.findByPhone(from);
            if (lead) {
              await Message.create({
                content: text,
                type: 'INCOMING',
                isBusiness: false,
                leadId: lead.id
              });
            }
          }
        }

        // Delivery / status events could be stored similarly; omitted for brevity
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.sendStatus(500);
  }
};

const sendTemplate = async (req, res, next) => {
  try {
    const { to, templateName, language, components } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ message: 'to and templateName are required' });
    }
    const response = await sendTemplateMessage({ to, templateName, language, components });

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
    next(error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  sendTemplate,
};
