import api from "./api";

export interface SettingsResponse {
  clinic: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    timezone: string;
    language: string;
    currency: string;
    logo?: string | null;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string | null;
    createdAt: string;
  };
  integrations: Record<string, { status: string; [key: string]: unknown }>;
  backupSettings: {
    autoBackup: boolean;
    backupFrequency: string;
    retentionDays: number;
    lastBackup: string | null;
    lastBackupFile?: string | null;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    leadAlerts: boolean;
    automationAlerts: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
  };
}

export const settingsService = {
  getSettings: async (): Promise<SettingsResponse> => {
    const response = await api.get("/settings");
    return response.data;
  },

  updateClinic: async (payload: Partial<SettingsResponse["clinic"]>) => {
    const response = await api.put("/settings/clinic", payload);
    return response.data;
  },

  updateProfile: async (payload: Partial<SettingsResponse["profile"]>) => {
    const response = await api.put("/settings/profile", payload);
    return response.data;
  },

  uploadLogo: async (formData: FormData): Promise<{ logo: string }> => {
    const response = await api.post("/settings/clinic/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  uploadProfilePhoto: async (formData: FormData): Promise<{ avatar: string }> => {
    const response = await api.post("/settings/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put("/settings/password", { currentPassword, newPassword });
    return response.data;
  },

  updateNotifications: async (payload: SettingsResponse["notificationSettings"]) => {
    const response = await api.put("/settings/notifications", payload);
    return response.data;
  },

  updateBackupSettings: async (payload: SettingsResponse["backupSettings"]) => {
    const response = await api.put("/settings/backup", payload);
    return response.data;
  },

  runBackup: async () => {
    const response = await api.post("/settings/backup/run");
    return response.data;
  },

  updateIntegration: async (type: string, status: string, data: Record<string, unknown> = {}) => {
    const response = await api.post("/settings/integrations", { type, status, data });
    return response.data;
  },

  exportData: async (format: "csv" | "json" | "pdf" = "json") => {
    const response = await api.post("/settings/export", { format }, { responseType: "blob" });
    return response;
  },

  deleteAccount: async () => {
    const response = await api.delete("/settings/account");
    return response.data;
  }
};
