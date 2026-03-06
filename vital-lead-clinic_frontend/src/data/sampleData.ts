export type LeadStatus = "new" | "hot" | "closed" | "lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  service: string;
  source: string;
  createdAt: string;
  lastContact: string;
  nextFollowUp: string | null;
  notes: string;
  messages: Message[];
  value: number;
}

export interface Message {
  id: string;
  text: string;
  sender: "clinic" | "client";
  timestamp: string;
  channel: "whatsapp" | "sms" | "email";
}

export interface KPIData {
  totalLeads: number;
  hotLeads: number;
  closedDeals: number;
  lostLeads: number;
  conversionRate: number;
  returnRate: number;
  revenue: number;
  avgResponseTime: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  delayDays: number;
  message: string;
  active: boolean;
  targetStatus: LeadStatus;
}
