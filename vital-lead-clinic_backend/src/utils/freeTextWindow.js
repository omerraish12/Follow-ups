const FREE_TEXT_WINDOW_MS = 24 * 60 * 60 * 1000;

const canUseFreeText = (lastInboundTimestamp) => {
  if (!lastInboundTimestamp) return false;

  const parsed = new Date(lastInboundTimestamp).getTime();
  if (Number.isNaN(parsed)) return false;

  return Date.now() - parsed <= FREE_TEXT_WINDOW_MS;
};

module.exports = {
  FREE_TEXT_WINDOW_MS,
  canUseFreeText
};
