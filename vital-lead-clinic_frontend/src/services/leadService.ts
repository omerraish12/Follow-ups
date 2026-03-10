import api from './api';
import type { Lead, LeadMessage as Message, LeadMessageFilters, LeadMessagesResponse } from "@/types/leads";

interface Filters {
  status?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
}

interface BulkUpdateData {
  status?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

interface BulkUpdateResult {
  message: string;
  count: number;
}

type LeadUpsertPayload = Omit<Lead, 'id'> & {
  id?: string;
  nextFollowUp?: string;
  assignedToId?: string | number;
  entryCode?: string;
  consentGiven?: boolean;
  consentTimestamp?: string | null;
};

export const leadService = {
  // Get all leads with filters
  getLeads: async (filters: Filters = {}): Promise<Lead[]> => {
    const params = new URLSearchParams();

    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.source && filters.source !== 'all') {
      params.append('source', filters.source);
    }
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      params.append('assignedTo', filters.assignedTo);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const response = await api.get(`/leads?${params.toString()}`);
    return response.data;
  },

  // Get single lead
  getLead: async (id: string): Promise<Lead> => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  getLeadMessages: async (
    id: string,
    params: LeadMessageFilters = {}
  ): Promise<LeadMessagesResponse> => {
    const search = new URLSearchParams();
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    entries.forEach(([key, value]) => {
      search.append(key, String(value));
    });

    const suffix = search.toString() ? `?${search.toString()}` : '';
    const response = await api.get(`/leads/${id}/messages${suffix}`);
    return response.data;
  },

  // Create lead
  createLead: async (leadData: LeadUpsertPayload): Promise<Lead> => {
    const response = await api.post('/leads', leadData);
    return response.data;
  },

  // Update lead
  updateLead: async (id: string, leadData: Partial<LeadUpsertPayload>): Promise<Lead> => {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  // Delete lead
  deleteLead: async (id: string): Promise<Lead> => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  // Add message to lead
  addMessage: async (
    leadId: string,
    messageData: Partial<Message> & { content: string; type?: 'SENT' | 'RECEIVED'; isBusiness?: boolean }
  ): Promise<Message> => {
    const response = await api.post(`/leads/${leadId}/messages`, messageData);
    return response.data;
  },

  retryMessage: async (leadId: string, messageId: string): Promise<Message> => {
    const response = await api.post(`/leads/${leadId}/messages/${messageId}/retry`);
    return response.data;
  },

  // Bulk update leads
  bulkUpdate: async (leadIds: string[], data: BulkUpdateData): Promise<BulkUpdateResult> => {
    const response = await api.post('/leads/bulk', { leadIds, data });
    return response.data;
  },

  // Get leads needing follow-up
  getFollowupNeeded: async (): Promise<Lead[]> => {
    const response = await api.get('/leads/followup/needed');
    return response.data;
  }
};
