const WA_WEB_PROVIDER = 'wa_web';

// Normalization now forces the only supported provider (WhatsApp Web).
const normalizeWhatsAppProvider = () => WA_WEB_PROVIDER;
const isMetaCloudProvider = () => false;
const isWaWebProvider = () => true;

module.exports = {
  WA_WEB_PROVIDER,
  normalizeWhatsAppProvider,
  isMetaCloudProvider,
  isWaWebProvider
};
