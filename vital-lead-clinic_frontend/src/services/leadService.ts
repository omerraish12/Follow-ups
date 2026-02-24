import api from './api';

// Define interfaces for lead, message, and other types as needed
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service?: string;
  assigned_to_name?: string;
  assigned_to?: string;
  source?: string;
  value?: number;
  created_at: string;
  last_contacted?: string;
  notes?: string;
  status: string;
  messages?: Message[];
}

interface Message {
  id: string;
  content: string;
  type: 'SENT' | 'RECEIVED';
  timestamp: string;
  is_business: boolean;
}

interface Filters {
  status?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
}

interface BulkUpdateData {
  status?: string;
  assignedTo?: string;
  [key: string]: any; // Allows for dynamic fields
}

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

  // Create lead
  createLead: async (leadData: Lead): Promise<Lead> => {
    const response = await api.post('/leads', leadData);
    return response.data;
  },

  // Update lead
  updateLead: async (id: string, leadData: Lead): Promise<Lead> => {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  // Delete lead
  deleteLead: async (id: string): Promise<Lead> => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  // Add message to lead
  addMessage: async (leadId: string, messageData: Message): Promise<Message> => {
    const response = await api.post(`/leads/${leadId}/messages`, messageData);
    return response.data;
  },

  // Bulk update leads
  bulkUpdate: async (leadIds: string[], data: BulkUpdateData): Promise<any> => {
    const response = await api.post('/leads/bulk', { leadIds, data });
    return response.data;
  },

  // Get leads needing follow-up
  getFollowupNeeded: async (): Promise<Lead[]> => {
    const response = await api.get('/leads/followup/needed');
    return response.data;
  }
};