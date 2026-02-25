import { useEffect, useState } from "react";
import { automationService } from "@/services/automationService";
import { toast } from "@/hooks/use-toast";
import type { Automation, AutomationPerformanceResponse } from "@/types/automation";

interface ErrorResponse {
  response?: { data?: { message?: string } };
}

export const useAutomations = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AutomationPerformanceResponse | null>(null);

  const fetchAutomations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await automationService.getAutomations();
      setAutomations(data);
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה בטעינת אוטומציות";
      setError(msg);
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await automationService.getPerformanceStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchStats();
  }, []);

  const getAutomation = async (id: string) => {
    try {
      return await automationService.getAutomation(id);
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה בטעינת אוטומציה";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const addAutomation = async (automationData: Partial<Automation>) => {
    try {
      const newAutomation = await automationService.createAutomation(automationData);
      setAutomations((prev) => [newAutomation, ...prev]);
      toast({ title: "אוטומציה נוספה", description: "האוטומציה נוספה בהצלחה" });
      return newAutomation;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה בהוספת אוטומציה";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const updateAutomation = async (id: string, automationData: Partial<Automation>) => {
    try {
      const updated = await automationService.updateAutomation(id, automationData);
      setAutomations((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast({ title: "אוטומציה עודכנה", description: "האוטומציה עודכנה בהצלחה" });
      return updated;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה בעדכון אוטומציה";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      await automationService.deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "אוטומציה נמחקה", description: "האוטומציה נמחקה בהצלחה" });
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה במחיקת אוטומציה";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const toggleAutomation = async (id: string) => {
    try {
      const updated = await automationService.toggleAutomation(id);
      setAutomations((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast({
        title: updated.active ? "אוטומציה הופעלה" : "אוטומציה הושבתה",
        description: "העדכון נשמר בהצלחה",
      });
      return updated;
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || "שגיאה בשינוי סטטוס";
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      throw err;
    }
  };

  return {
    automations,
    isLoading,
    error,
    stats,
    fetchAutomations,
    fetchStats,
    getAutomation,
    addAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
  };
};
