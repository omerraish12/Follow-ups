import api from "./api";

export interface PlatformClinic {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  whatsappProvisioned: boolean;
  provider: string;
  displayPhoneNumber: string | null;
  waPhoneNumberId: string | null;
  lastConnectedAt: string | null;
  updatedAt: string | null;
  leads: number;
}

export interface PlatformAnalyticsTotals {
  totalSent: number;
  totalReceived: number;
  totalMessages: number;
  estimatedCostUsd: number;
  costPerMessageUsd: number;
}

export interface PlatformAnalyticsDay {
  day: string;
  sent: number;
  received: number;
  total: number;
}

export interface PlatformAnalyticsClinic {
  id: number;
  name: string;
  sent: number;
  received: number;
  leads: number;
}

export interface PlatformAnalyticsPayload {
  totals: PlatformAnalyticsTotals;
  messagesLast30Days: PlatformAnalyticsDay[];
  clinics: PlatformAnalyticsClinic[];
  generatedAt: string;
}

export const platformService = {
  getClinics: async (): Promise<PlatformClinic[]> => {
    const response = await api.get("/platform/clinics");
    return response.data?.clinics || [];
  },
  getAnalytics: async (): Promise<PlatformAnalyticsPayload> => {
    const response = await api.get("/platform/analytics");
    return (
      response.data || {
        totals: {
          totalSent: 0,
          totalReceived: 0,
          totalMessages: 0,
          estimatedCostUsd: 0,
          costPerMessageUsd: 0
        },
        messagesLast30Days: [],
        clinics: [],
        generatedAt: new Date().toISOString()
      }
    );
  }
};
