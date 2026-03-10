const axios = require('axios');

const trimValue = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const getBridgeConfig = () => {
  console.log("BRIDGE_URL: ", process.env.WA_WEB_BRIDGE_URL); 
  const baseURL = trimValue(process.env.WA_WEB_BRIDGE_URL);
  console.log("baseURL: ", baseURL); 

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

const connectSession = async (clinicId) => {
  const client = createClient();
  const response = await client.post(`/sessions/${clinicId}/connect`);
  return response.data;
};

const getSessionStatus = async (clinicId) => {
  const client = createClient();
  const response = await client.get(`/sessions/${clinicId}`);
  return response.data;
};

const disconnectSession = async (clinicId) => {
  const client = createClient();
  const response = await client.post(`/sessions/${clinicId}/disconnect`);
  return response.data;
};

const sendMessage = async (payload) => {
  const client = createClient();
  const response = await client.post('/messages/send', payload);
  return response.data;
};

module.exports = {
  connectSession,
  getSessionStatus,
  disconnectSession,
  sendMessage
};
