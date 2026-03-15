import api from "./api";

export interface ImportStatus {
  contracts: {
    leads: number;
    errors: number;
    events: number;
  };
  whatsappHistory: {
    leads: number;
    messages: number;
  };
}

export const getImportStatus = async (): Promise<ImportStatus> => {
  const { data } = await api.get("/imports/status");
  return data;
};
