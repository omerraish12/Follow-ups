export type LeadStatus = 'NEW' | 'HOT' | 'CLOSED' | 'LOST';

export interface LeadMessage {
  id: string;
  content: string;
  type: 'SENT' | 'RECEIVED';
  timestamp: string;
  is_business?: boolean;
  provider_message_id?: string | null;
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received' | string | null;
  status_updated_at?: string | null;
  message_origin?: 'manual' | 'template' | 'automation' | 'ai_receptionist' | 'patient' | string | null;
  delivery_error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LeadMessageFilters {
  limit?: number;
  before?: string;
  after?: string;
  search?: string;
  direction?: 'sent' | 'received';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  origin?: 'manual' | 'template' | 'automation' | 'ai_receptionist' | 'patient';
  dateFrom?: string;
  dateTo?: string;
}

export interface LeadMessagePagination {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
}

export interface LeadMessagesResponse {
  messages: LeadMessage[];
  pagination: LeadMessagePagination;
  lead: {
    id: string;
    last_inbound_message_at: string | null;
    can_use_free_text: boolean;
    message_count: number;
    filtered_message_count?: number;
  };
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
  message_count?: number;
  messagePagination?: LeadMessagePagination;
  last_message_content?: string;
  last_message_at?: string;
  last_message_type?: string;
  last_message_is_business?: boolean;
  last_inbound_message_at?: string;
  can_use_free_text?: boolean;
  consent_given?: boolean;
  consent_timestamp?: string;
}
