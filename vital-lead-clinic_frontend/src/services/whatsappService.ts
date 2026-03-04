import api from "./api";

export interface LatestMessageTimestampResponse {
  last_message_at: string | null;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language?: string;
}

export interface WhatsAppSandboxInfo {
  joinCode: string;
  number: string;
  link: string;
  lastJoinedAt: string | null;
}

export interface WhatsAppIntegrationConfig {
  status: "connected" | "connecting" | "disconnected";
  sandbox: WhatsAppSandboxInfo;
  templates: WhatsAppTemplate[];
  lastConnectedAt: string | null;
  updatedAt: string | null;
  accountSid?: string | null;
  authToken?: string | null;
  messagingServiceSid?: string | null;
  whatsappFrom?: string | null;
  authTokenSet?: boolean;
}

export interface WhatsAppSenderInfo {
  provider: string;
  sender: string | null;
  displayNumber: string | null;
  status?: string;
  message?: string;
}

const DEFAULT_SANDBOX: WhatsAppSandboxInfo = {
  joinCode: "",
  number: "",
  link: "",
  lastJoinedAt: null,
};

export const getDefaultWhatsAppConfig = (): WhatsAppIntegrationConfig => ({
  status: "disconnected",
  sandbox: DEFAULT_SANDBOX,
  templates: [],
  lastConnectedAt: null,
  updatedAt: null,
  accountSid: null,
  authToken: null,
  messagingServiceSid: null,
  whatsappFrom: null
  ,
  authTokenSet: false
});

const getIntegrations = async () => {
  const response = await api.get("/settings");
  return response.data?.integrations || {};
};

export const whatsappService = {
  getLatestMessageTimestamp: async (): Promise<LatestMessageTimestampResponse> => {
    const response = await api.get("/whatsapp/latest-message");
    return response.data;
  },

  getConfig: async (): Promise<WhatsAppIntegrationConfig> => {
    const integrations = await getIntegrations();
    const config = integrations.whatsapp || {};
    return {
      ...getDefaultWhatsAppConfig(),
      ...config,
      authTokenSet: Boolean(config.authTokenSet || config.authToken)
    };
  },

  sendTemplate: async (payload: { to: string; templateName: string; language?: string; components?: any[]; mediaUrl?: string }) => {
    const response = await api.post("/whatsapp/send-template", payload);
    return response.data;
  },

  getSenderInfo: async (): Promise<WhatsAppSenderInfo> => {
    const response = await api.get("/whatsapp/sender");
    return response.data;
  },

  getFAQ: async (): Promise<{ faq: { questionKey: string; answerKey: string }[] }> => {
    const response = await api.get("/whatsapp/faq");
    return response.data || { faq: [] };
  },
};
