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
  entry_code?: string;
  entryCode?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  messages?: LeadMessage[];
  last_message_content?: string;
  last_message_at?: string;
  last_message_type?: string;
  last_message_is_business?: boolean;
  last_inbound_message_at?: string;
  can_use_free_text?: boolean;
  consent_given?: boolean;
  consent_timestamp?: string;
}
