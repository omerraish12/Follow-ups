import api from "./api";
import type { LeadMessage } from "@/types/leads";

export type WhatsAppProvider = "wa_web";

export interface LatestMessageTimestampResponse {
  last_message_at: string | null;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language?: string;
}

export interface WhatsAppIntegrationConfig {
  provider: WhatsAppProvider;
  status: "connected" | "connecting" | "disconnected";
  lastConnectedAt: string | null;
  updatedAt: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
}

export interface WhatsAppSenderInfo {
  provider: WhatsAppProvider;
  sender: string | null;
  displayNumber: string | null;
  status?: string;
  sessionStatus?: string | null;
  deviceJid?: string | null;
  message?: string;
}

export interface WhatsAppSessionRecord {
  id?: string;
  clinic_id?: string;
  provider: WhatsAppProvider;
  status: string;
  qr_code?: string | null;
  device_jid?: string | null;
  last_connected_at?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WhatsAppSessionResponse {
  provider: WhatsAppProvider;
  session: WhatsAppSessionRecord | null;
}

export interface WhatsAppQrResponse {
  provider: WhatsAppProvider;
  qrCode: string | null;
  status: string;
}

export interface SendTemplateResponse {
  success: boolean;
  response: unknown;
  messageRecord?: LeadMessage | null;
}

export const getDefaultWhatsAppConfig = (): WhatsAppIntegrationConfig => ({
  provider: "wa_web",
  status: "disconnected",
  lastConnectedAt: null,
  updatedAt: null,
  displayPhoneNumber: null,
  verifiedName: null,
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
      provider: "wa_web",
    };
  },

  sendTemplate: async (payload: {
    to: string;
    templateName: string;
    language?: string;
    components?: unknown[];
    mediaUrl?: string;
    templateParameters?: string[];
  }): Promise<SendTemplateResponse> => {
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

  connectSession: async (): Promise<WhatsAppSessionResponse> => {
    const response = await api.post("/whatsapp/sessions/connect");
    return response.data;
  },

  getSessionStatus: async (): Promise<WhatsAppSessionResponse> => {
    const response = await api.get("/whatsapp/sessions/status");
    return response.data;
  },

  getSessionQr: async (): Promise<WhatsAppQrResponse> => {
    const response = await api.get("/whatsapp/sessions/qr");
    return response.data;
  },

  disconnectSession: async (): Promise<{ success: boolean }> => {
    const response = await api.post("/whatsapp/sessions/disconnect");
    return response.data;
  },
};
