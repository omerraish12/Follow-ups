import { useCallback, useEffect, useState } from "react";
import { integrationLogService, IntegrationLogEntry } from "@/services/integrationLogService";

export const useIntegrationLogs = (limit = 6) => {
  const [logs, setLogs] = useState<IntegrationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await integrationLogService.getSystemLogs(limit);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load integration logs", err);
      setError("Unable to load logs");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  return {
    logs,
    isLoading,
    error,
    refreshLogs
  };
};
