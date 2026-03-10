const META_CLOUD_PROVIDER = 'meta_cloud';
const WA_WEB_PROVIDER = 'wa_web';
const LEGACY_META_PROVIDERS = new Set(['cellactpro', 'meta', 'cloud_api', 'meta_cloud']);

const normalizeWhatsAppProvider = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return WA_WEB_PROVIDER;
  }

  if (LEGACY_META_PROVIDERS.has(normalized)) {
    return META_CLOUD_PROVIDER;
  }

  if (normalized === WA_WEB_PROVIDER) {
    return WA_WEB_PROVIDER;
  }

  return normalized;
};

const isMetaCloudProvider = (value) => normalizeWhatsAppProvider(value) === META_CLOUD_PROVIDER;
const isWaWebProvider = (value) => normalizeWhatsAppProvider(value) === WA_WEB_PROVIDER;

module.exports = {
  META_CLOUD_PROVIDER,
  WA_WEB_PROVIDER,
  normalizeWhatsAppProvider,
  isMetaCloudProvider,
  isWaWebProvider
};
