import { useCallback, useEffect, useState } from "react";
import { automationService } from "@/services/automationService";

export interface AutomationReply {
  id: number;
  automation_id: number;
  lead_id: number;
  automation_name: string;
  lead_name: string;
  message: string;
  replied_at: string;
  executed_at: string;
}

export const useAutomationReplies = (limit = 5) => {
  const [replies, setReplies] = useState<AutomationReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReplies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await automationService.getRecentReplies();
      setReplies(data);
    } catch (err) {
      console.error("Error loading automation replies", err);
      setError("Unable to load replies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  return { replies, isLoading, error, refresh: loadReplies };
};
