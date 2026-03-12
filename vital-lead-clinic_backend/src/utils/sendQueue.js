const { DateTime } = require('luxon');
const Message = require('../models/Message');
const IntegrationLog = require('../models/IntegrationLog');
const { sendTemplateMessage } = require('../services/whatsappService');
const { query } = require('../config/database');

const enqueueWhatsAppMessage = async ({
  leadId,
  clinicId,
  content,
  templateName,
  language = 'en',
  mediaUrl = null,
  templateParameters = [],
  messageOrigin = 'automation',
  metadata = {}
}) => {
  return Message.create({
    content,
    type: 'SENT',
    isBusiness: true,
    leadId,
    deliveryStatus: 'queued',
    messageOrigin,
    metadata: {
      ...metadata,
      templateName,
      language,
      mediaUrl,
      templateParameters,
      retryCount: 0,
      to: metadata.to
    }
  });
};

const processPendingMessages = async (limit = 50) => {
  const pending = await query(
    `SELECT m.*, l.phone
       FROM messages m
       JOIN leads l ON l.id = m.lead_id
      WHERE m.delivery_status IN ('queued','failed')
        AND COALESCE((m.metadata->>'retryCount')::int, 0) < 3
        AND m.message_origin IN ('automation','template')
      ORDER BY m.status_updated_at ASC
      LIMIT $1`,
    [limit]
  );

  for (const row of pending.rows) {
    const meta = row.metadata || {};
    const retryCount = Number(meta.retryCount || 0);
    const nextRetryCount = retryCount + 1;
    try {
      const body =
        meta.body ||
        row.content ||
        meta.templateName ||
        meta.template_name ||
        meta.language ||
        '';
      const providerResponse = await sendTemplateMessage({
        to: meta.to || row.metadata?.to || null,
        body,
        templateName: meta.templateName || meta.template_name || row.content,
        language: meta.language || 'en',
        mediaUrl: meta.mediaUrl || null,
        templateParameters: meta.templateParameters || [],
        clinicId: row.clinic_id
      });

      await Message.updateDeliveryById(row.id, {
        deliveryStatus: 'sent',
        deliveryError: null,
        providerMessageId: providerResponse?.messages?.[0]?.id || providerResponse?.messageId || null,
        metadata: {
          ...meta,
          retryCount: nextRetryCount,
          lastRetriedAt: DateTime.utc().toISO()
        }
      });
    } catch (error) {
      await Message.updateDeliveryById(row.id, {
        deliveryStatus: 'failed',
        deliveryError: error.response?.data?.message || error.message || 'Send failed',
        metadata: {
          ...meta,
          retryCount: nextRetryCount,
          lastRetriedAt: DateTime.utc().toISO()
        }
      });
      await IntegrationLog.create({
        type: 'whatsapp_send',
        message: error.message || 'WhatsApp send failed',
        metadata: {
          messageId: row.id,
          leadId: row.lead_id,
          retryCount: nextRetryCount,
          error: error.response?.data || error.message
        },
        clinicId: row.clinic_id
      });
    }
  }
};

module.exports = {
  enqueueWhatsAppMessage,
  processPendingMessages
};
