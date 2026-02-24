import { useState, useEffect } from 'react';
import { leadService } from '@/services/leadService';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  messages?: Message[];
  last_contacted?: string;
  // Add any other lead-specific properties you need
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  // Add any other message-specific properties you need
}

interface Filters {
  [key: string]: any;
}

interface BulkUpdateResult {
  count: number;
  // Add other fields if needed from the bulk update result
}

export const useLeads = (initialFilters: Filters = {}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const fetchLeads = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadService.getLeads(filters);
      setLeads(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'שגיאה בטעינת לידים');
      toast({
        title: "שגיאה",
        description: 'שגיאה בטעינת לידים',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const getLead = async (id: string): Promise<Lead> => {
    try {
      return await leadService.getLead(id);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: 'שגיאה בטעינת ליד',
        variant: "destructive",
      });
      throw error;
    }
  };

  const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead> => {
    try {
      const newLead = await leadService.createLead(leadData);
      setLeads(prev => [newLead, ...prev]);
      toast({
        title: "ליד נוסף",
        description: "הליד נוסף בהצלחה",
      });
      return newLead;
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה בהוספת ליד',
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLead = async (id: string, leadData: Omit<Lead, 'id'>): Promise<Lead> => {
    try {
      const updated = await leadService.updateLead(id, leadData);
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
      toast({
        title: "ליד עודכן",
        description: "הליד עודכן בהצלחה",
      });
      return updated;
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה בעדכון ליד',
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLead = async (id: string): Promise<void> => {
    try {
      await leadService.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast({
        title: "ליד נמחק",
        description: "הליד נמחק בהצלחה",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה במחיקת ליד',
        variant: "destructive",
      });
      throw error;
    }
  };

  const addMessage = async (leadId: string, messageData: { content: string }): Promise<Message> => {
    try {
      const message = await leadService.addMessage(leadId, messageData);

      // Update lead in state with new message
      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            messages: [...(l.messages || []), message],
            last_contacted: new Date().toISOString()
          };
        }
        return l;
      }));

      return message;
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה בשליחת הודעה',
        variant: "destructive",
      });
      throw error;
    }
  };

  const bulkUpdate = async (leadIds: string[], data: { [key: string]: any }): Promise<BulkUpdateResult> => {
    try {
      const result = await leadService.bulkUpdate(leadIds, data);

      // Refresh leads after bulk update
      await fetchLeads();

      toast({
        title: "עודכן",
        description: `${result.count} לידים עודכנו בהצלחה`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה בעדכון קבוצתי',
        variant: "destructive",
      });
      throw error;
    }
  };

  const getFollowupNeeded = async (): Promise<Lead[]> => {
    try {
      return await leadService.getFollowupNeeded();
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.response?.data?.message || 'שגיאה בטעינת לידים למעקב',
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    leads,
    isLoading,
    error,
    filters,
    setFilters,
    fetchLeads,
    getLead,
    addLead,
    updateLead,
    deleteLead,
    addMessage,
    bulkUpdate,
    getFollowupNeeded
  };
};