export type LeadStatus = 'NEW' | 'HOT' | 'CLOSED' | 'LOST';

export interface LeadMessage {
  id: string;
  content: string;
  type: 'SENT' | 'RECEIVED';
  timestamp: string;
  is_business?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  service?: string;
  source?: string;
  status: LeadStatus;
  value?: number;
  created_at?: string;
  last_contacted?: string;
  next_follow_up?: string;
  nextFollowUp?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  messages?: LeadMessage[];
}
