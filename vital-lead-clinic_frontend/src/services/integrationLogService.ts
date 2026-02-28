import api from "./api";

export interface IntegrationLogEntry {
  id: number;
  type: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const integrationLogService = {
  getSystemLogs: async (limit = 6): Promise<IntegrationLogEntry[]> => {
    const response = await api.get(`/logs/system-errors?limit=${limit}`);
    return response.data;
  }
};
