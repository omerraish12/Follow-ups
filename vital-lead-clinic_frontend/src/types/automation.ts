import { LeadStatus } from "./leads";

export type AutomationStatus = "pending" | "approved" | "rejected" | string;

export interface AutomationComponent {
  type: "quick_reply";
  title: string;
  payload?: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger_days?: number[];
  message: string;
  target_status?: LeadStatus | string;
  notify_on_reply?: boolean;
  personalization?: string[];
  active?: boolean;
  total_executions?: number;
  reply_count?: number;
  success_rate?: number;
  last_executed?: string;
  created_at?: string;
  updated_at?: string;
  template_name?: string;
  template_language?: string;
  template_status?: AutomationStatus;
  components?: AutomationComponent[];
}

export interface AutomationPerformanceResponse {
  stats: {
    id: string;
    name: string;
    total_executions: number;
    reply_count: number;
    success_rate: number;
    active: boolean;
  }[];
  totals: {
    total_executions: number;
    total_replies: number;
    active_count: number;
  };
}

export interface SeedDefaultAutomationsResponse {
  created: Automation[];
  createdCount: number;
  message: string;
}
