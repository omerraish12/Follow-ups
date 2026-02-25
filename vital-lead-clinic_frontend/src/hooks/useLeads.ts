import { useState, useEffect } from 'react';
import { leadService } from '@/services/leadService';
import { toast } from '@/hooks/use-toast';
import type { Lead, LeadMessage } from '@/types/leads';

interface Filters {
  [key: string]: any;
}

interface BulkUpdateResult {
  count: number;
}

interface ErrorResponse {
  response?: { data?: { message?: string } };
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
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בטעינת לידים';
      setError(msg);
      toast({
        title: "שגיאה",
        description: msg,
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
    } catch (err: ErrorResponse) {
      toast({
        title: "שגיאה",
        description: 'שגיאה בטעינת ליד',
        variant: "destructive",
      });
      throw err;
    }
  };

  const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead> => {
    try {
      const newLead = await leadService.createLead(leadData as any);
      setLeads(prev => [newLead, ...prev]);
      toast({
        title: "ליד נוסף",
        description: "הליד נוסף בהצלחה",
      });
      return newLead;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בהוספת ליד';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const updateLead = async (id: string, leadData: Partial<Lead>): Promise<Lead> => {
    try {
      const updated = await leadService.updateLead(id, leadData as any);
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
      toast({
        title: "ליד עודכן",
        description: "הליד עודכן בהצלחה",
      });
      return updated;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בעדכון ליד';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
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
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה במחיקת ליד';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const addMessage = async (leadId: string, messageData: { content: string }): Promise<LeadMessage> => {
    try {
      const message = await leadService.addMessage(leadId, messageData as any);
      setLeads(prev => prev.map(l => l.id === leadId ? {
        ...l,
        messages: [...(l.messages || []), message],
        last_contacted: new Date().toISOString()
      } : l));
      return message;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בשליחת הודעה';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const bulkUpdate = async (leadIds: string[], data: { [key: string]: any }): Promise<BulkUpdateResult> => {
    try {
      const result = await leadService.bulkUpdate(leadIds, data);
      await fetchLeads();
      toast({
        title: "עודכן",
        description: `${result.count} לידים עודכנו בהצלחה`,
      });
      return result;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בעדכון קבוצתי';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const getFollowupNeeded = async (): Promise<Lead[]> => {
    try {
      return await leadService.getFollowupNeeded();
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || 'שגיאה בטעינת לידים למעקב';
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
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
