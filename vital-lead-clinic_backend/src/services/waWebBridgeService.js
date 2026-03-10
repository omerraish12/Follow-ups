const axios = require('axios');

const trimValue = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const getBridgeConfig = () => {
  const baseURL = trimValue(process.env.WA_WEB_BRIDGE_URL);

  if (!baseURL) {
    throw new Error('WA_WEB_BRIDGE_URL is not configured');
  }

  return {
    baseURL: baseURL.replace(/\/$/, ''),
    apiKey: trimValue(process.env.WA_WEB_BRIDGE_API_KEY),
    timeout: parseInt(process.env.WA_WEB_BRIDGE_TIMEOUT_MS || '15000', 10)
  };
};

const createClient = () => {
  const config = getBridgeConfig();

  return axios.create({
    baseURL: config.baseURL,
    timeout: Number.isFinite(config.timeout) ? config.timeout : 15000,
    headers: {
      ...(config.apiKey ? { 'x-bridge-api-key': config.apiKey } : {})
    }
  });
};

const shouldRetry = (error) => {
  const code = error?.code || '';
  return ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code);
};

const withRetry = async (fn, attempts = 2) => {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || i === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw lastError;
};

const connectSession = async (clinicId) => {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.post(`/sessions/${clinicId}/connect`);
    return response.data;
  });
};

const getSessionStatus = async (clinicId) => {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.get(`/sessions/${clinicId}`);
    return response.data;
  });
};

const disconnectSession = async (clinicId) => {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.post(`/sessions/${clinicId}/disconnect`);
    return response.data;
  });
};

const sendMessage = async (payload) => {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.post('/messages/send', payload);
    return response.data;
  });
};

module.exports = {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage
};
