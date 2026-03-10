const Message = require('../models/Message');
const Activity = require('../models/Activity');
const IntegrationLog = require('../models/IntegrationLog');
const { sendWhatsAppMessage } = require('./whatsappService');

const extractProviderMessageId = (response) =>
  response?.messages?.[0]?.id || response?.messageId || null;

const FAQ_RESPONSES = [
  {
    id: 'hours',
    keywords: ['hour', 'open', 'working hours', 'schedule'],
    response: 'Our clinic is open Sunday through Friday, 8:00 to 20:00. Reply with a preferred time and we will confirm your visit.'
  },
  {
    id: 'location',
    keywords: ['location', 'address', 'where', 'come'],
    response: 'You can find us at 10 Dizengoff Street, Tel Aviv. Reply with “directions” and we can text you a map link.'
  },
  {
    id: 'pricing',
    keywords: ['price', 'cost', 'fee', 'how much'],
    response: 'Treatment costs vary based on the service. Send us the procedure you are interested in and we will share a tailored quote.'
  },
  {
    id: 'appointments',
    keywords: ['book', 'appointment', 'reserve', 'slot', 'available'],
    response: 'We are happy to schedule your visit. Send us three preferred dates/times and we will confirm the earliest opening.'
  }
];

const normalizeText = (text) => (text || '').toLowerCase().trim();

const findResponseForText = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return null;
  }
  return FAQ_RESPONSES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  ) || null;
};

const shouldSkipRepeat = async (leadId, responseText) => {
  const lastMessage = await Message.getLastMessage(leadId);
  if (!lastMessage) return false;
  if (!lastMessage.is_business) return false;
  if (typeof lastMessage.content !== 'string') return false;
  const normalizedLast = normalizeText(lastMessage.content);
  const normalizedResponse = normalizeText(responseText);
  if (!normalizedResponse) return false;
  return normalizedLast === normalizedResponse;
};

async function respondToMessage({ lead, text, clinicId }) {
  if (!lead?.id || !lead.phone || !text) {
    return null;
  }

  const response = findResponseForText(text);
  if (!response) {
    return null;
  }

  if (await shouldSkipRepeat(lead.id, response.response)) {
    return null;
  }

  try {
    const providerResponse = await sendWhatsAppMessage({
      to: lead.phone,
      body: response.response,
      clinicId
    });

    await Message.create({
      content: response.response,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      providerMessageId: extractProviderMessageId(providerResponse),
      deliveryStatus: 'sent',
      messageOrigin: 'ai_receptionist',
      metadata: {
        responseId: response.id
      }
    });

    await Activity.create({
      type: 'MESSAGE_SENT',
      description: `AI receptionist replied with "${response.id}"`,
      userId: null,
      leadId: lead.id
    });

    return response;
  } catch (error) {
    console.error('AI receptionist failed to send message:', error);
    await Message.create({
      content: response.response,
      type: 'SENT',
      isBusiness: true,
      leadId: lead.id,
      deliveryStatus: 'failed',
      messageOrigin: 'ai_receptionist',
      deliveryError: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'AI receptionist send failed.',
      metadata: {
        responseId: response.id,
        providerError: error.response?.data || error.message
      }
    });
    await IntegrationLog.create({
      type: 'ai_receptionist',
      message: error.response?.data?.message || error.message || 'AI receptionist send failed',
      metadata: {
        leadId: lead.id,
        clinicId,
        responseId: response.id,
        error: error.response?.data || error.message
      },
      clinicId
    });
    return null;
  }
}

module.exports = {
  respondToMessage
};
