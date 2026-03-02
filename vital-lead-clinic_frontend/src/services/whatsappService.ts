import api from "./api";
import { settingsService } from "./settingsService";

export type WhatsAppConnectionStatus = "disconnected" | "connecting" | "connected";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  usage: number;
  successRate: number;
  language: string;
  category: "followup" | "promotion" | "welcome" | "reminder";
}

export interface WhatsAppImportHistory {
  id: string;
  filename: string;
  date: string;
  messages: number;
  status: "completed" | "processing" | "failed";
}

export interface WhatsAppFilterSettings {
  ignorePersonal: boolean;
  ignoreGroups: boolean;
  businessKeywords: boolean;
  minMessageLength: number;
  dateRange: "week" | "month" | "3months" | "6months" | "year";
  keywords: string;
}

export interface WhatsAppSandboxInfo {
  joinCode: string;
  number: string;
  link: string;
  lastJoinedAt: string | null;
}

export interface WhatsAppIntegrationConfig {
  status: WhatsAppConnectionStatus;
  phoneNumber: string;
  apiKey: string;
  webhookUrl: string;
  verificationToken: string;
  webhookSsl: boolean;
  filters: WhatsAppFilterSettings;
  templates: WhatsAppTemplate[];
  importHistory: WhatsAppImportHistory[];
  sandbox: WhatsAppSandboxInfo;
  lastConnectedAt: string | null;
  updatedAt: string | null;
}

const DEFAULT_CONFIG: WhatsAppIntegrationConfig = {
  status: "disconnected",
  phoneNumber: "",
  apiKey: "",
  webhookUrl: "https://api.yourclinic.com/whatsapp/webhook",
  verificationToken: "",
  webhookSsl: true,
  filters: {
    ignorePersonal: true,
    ignoreGroups: true,
    businessKeywords: true,
    minMessageLength: 10,
    dateRange: "3months",
    keywords: "appointment, treatment, price, whitening, consultation, clinic, booking",
  },
  templates: [],
  importHistory: [],
  sandbox: {
    joinCode: "wood-silent",
    number: "whatsapp:+14155238886",
    link: "https://www.twilio.com/console/sms/whatsapp/sandbox",
    lastJoinedAt: null,
  },
  lastConnectedAt: null,
  updatedAt: null,
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const parseSuccessRate = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value.replace("%", "").trim());
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }

  return 0;
};

const normalizeTemplate = (value: unknown): WhatsAppTemplate | null => {
  const obj = asObject(value);
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const message = typeof obj.message === "string" ? obj.message.trim() : "";

  if (!name || !message) {
    return null;
  }

  const id = typeof obj.id === "string" && obj.id ? obj.id : crypto.randomUUID?.() || String(Date.now());
  const usage = Number(obj.usage) || 0;
  const category = typeof obj.category === "string" ? obj.category : "followup";

  return {
    id,
    name,
    message,
    usage: Math.max(0, usage),
    successRate: parseSuccessRate(obj.successRate),
    language: typeof obj.language === "string" && obj.language ? obj.language : "en",
    category: ["followup", "promotion", "welcome", "reminder"].includes(category) ? (category as WhatsAppTemplate["category"]) : "followup",
  };
};

const normalizeImportHistory = (value: unknown): WhatsAppImportHistory | null => {
  const obj = asObject(value);
  const filename = typeof obj.filename === "string" ? obj.filename.trim() : "";
  if (!filename) {
    return null;
  }

  const status = typeof obj.status === "string" ? obj.status : "completed";
  const id = typeof obj.id === "string" && obj.id ? obj.id : crypto.randomUUID?.() || String(Date.now());

  return {
    id,
    filename,
    date: typeof obj.date === "string" && obj.date ? obj.date : new Date().toISOString(),
    messages: Math.max(0, Number(obj.messages) || 0),
    status: ["completed", "processing", "failed"].includes(status) ? (status as WhatsAppImportHistory["status"]) : "completed",
  };
};

const sanitizeString = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const normalizeSandboxInfo = (value: unknown): WhatsAppSandboxInfo => {
  const obj = asObject(value);
  return {
    joinCode: sanitizeString(obj.joinCode, DEFAULT_CONFIG.sandbox.joinCode),
    number: sanitizeString(obj.number, DEFAULT_CONFIG.sandbox.number),
    link: sanitizeString(obj.link, DEFAULT_CONFIG.sandbox.link),
    lastJoinedAt: typeof obj.lastJoinedAt === "string" ? obj.lastJoinedAt : DEFAULT_CONFIG.sandbox.lastJoinedAt,
  };
};

export const normalizeWhatsAppConfig = (raw: unknown): WhatsAppIntegrationConfig => {
  const obj = asObject(raw);
  const filters = asObject(obj.filters);
  const status = typeof obj.status === "string" ? obj.status : DEFAULT_CONFIG.status;

  return {
    status: ["disconnected", "connecting", "connected"].includes(status)
      ? (status as WhatsAppConnectionStatus)
      : DEFAULT_CONFIG.status,
    phoneNumber: typeof obj.phoneNumber === "string" ? obj.phoneNumber : DEFAULT_CONFIG.phoneNumber,
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey : DEFAULT_CONFIG.apiKey,
    webhookUrl: typeof obj.webhookUrl === "string" && obj.webhookUrl ? obj.webhookUrl : DEFAULT_CONFIG.webhookUrl,
    verificationToken: typeof obj.verificationToken === "string" ? obj.verificationToken : DEFAULT_CONFIG.verificationToken,
    webhookSsl: typeof obj.webhookSsl === "boolean" ? obj.webhookSsl : DEFAULT_CONFIG.webhookSsl,
    filters: {
      ignorePersonal: typeof filters.ignorePersonal === "boolean" ? filters.ignorePersonal : DEFAULT_CONFIG.filters.ignorePersonal,
      ignoreGroups: typeof filters.ignoreGroups === "boolean" ? filters.ignoreGroups : DEFAULT_CONFIG.filters.ignoreGroups,
      businessKeywords: typeof filters.businessKeywords === "boolean" ? filters.businessKeywords : DEFAULT_CONFIG.filters.businessKeywords,
      minMessageLength: Number(filters.minMessageLength) > 0 ? Number(filters.minMessageLength) : DEFAULT_CONFIG.filters.minMessageLength,
      dateRange: typeof filters.dateRange === "string" && ["week", "month", "3months", "6months", "year"].includes(filters.dateRange)
        ? (filters.dateRange as WhatsAppFilterSettings["dateRange"])
        : DEFAULT_CONFIG.filters.dateRange,
      keywords: typeof filters.keywords === "string" ? filters.keywords : DEFAULT_CONFIG.filters.keywords,
    },
    templates: Array.isArray(obj.templates)
      ? obj.templates
          .map(normalizeTemplate)
          .filter((template): template is WhatsAppTemplate => Boolean(template))
      : DEFAULT_CONFIG.templates,
    importHistory: Array.isArray(obj.importHistory)
      ? obj.importHistory
          .map(normalizeImportHistory)
          .filter((item): item is WhatsAppImportHistory => Boolean(item))
      : DEFAULT_CONFIG.importHistory,
    sandbox: normalizeSandboxInfo(obj.sandbox),
    lastConnectedAt: typeof obj.lastConnectedAt === "string" ? obj.lastConnectedAt : DEFAULT_CONFIG.lastConnectedAt,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : DEFAULT_CONFIG.updatedAt,
  };
};

export const getDefaultWhatsAppConfig = (): WhatsAppIntegrationConfig => ({ ...DEFAULT_CONFIG });

export const whatsappService = {
  getConfig: async (): Promise<WhatsAppIntegrationConfig> => {
    const settings = await settingsService.getSettings();
    return normalizeWhatsAppConfig(settings?.integrations?.whatsapp);
  },

  saveConfig: async (config: WhatsAppIntegrationConfig): Promise<WhatsAppIntegrationConfig> => {
    const integrationMap = await settingsService.updateIntegration("whatsapp", config.status, config as unknown as Record<string, unknown>);
    const saved = asObject(integrationMap).whatsapp;
    return normalizeWhatsAppConfig(saved);
  },

  confirmSandboxJoin: async (): Promise<WhatsAppIntegrationConfig> => {
    const payload = {
      sandbox: {
        lastJoinedAt: new Date().toISOString(),
      },
    };
    const integrationMap = await settingsService.updateIntegration("whatsapp", "connected", payload);
    const saved = asObject(integrationMap).whatsapp;
    return normalizeWhatsAppConfig(saved);
  },

  sendTemplate: async (payload: { to: string; templateName: string; language?: string; components?: unknown[] }) => {
    const response = await api.post("/whatsapp/send-template", payload);
    return response.data;
  },
};
