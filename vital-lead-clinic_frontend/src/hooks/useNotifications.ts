import { useCallback, useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MarkAsReadOptions, NotificationItem, NotificationsState } from "@/types/notifications";

interface ErrorResponse {
  response?: { data?: { message?: string } };
}

interface UseNotificationsOptions {
  limit?: number;
  autoFetch?: boolean;
}

const notificationEventTarget = typeof window !== "undefined" ? new EventTarget() : null;

export const notificationCountEmitter = notificationEventTarget;

const broadcastUnreadCount = (count: number) => {
  notificationEventTarget?.dispatchEvent(new CustomEvent("unreadCount", { detail: count }));
};

export const useNotifications = (
  options: UseNotificationsOptions = {}
): NotificationsState => {
  const { t } = useLanguage();
  const { limit = 50, autoFetch = true } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const syncUnreadCount = useCallback((items: NotificationItem[]) => {
    setUnreadCount(items.filter((n) => !n.read).length);
    broadcastUnreadCount(items.filter((n) => !n.read).length);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, count] = await Promise.all([
        notificationService.getNotifications(limit),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(items);
      const resolvedCount = typeof count === "number" ? count : items.filter((n) => !n.read).length;
      setUnreadCount(resolvedCount);
      broadcastUnreadCount(resolvedCount);
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || t("error_loading_notifications");
      setError(msg);
      toast({
        title: t("error"),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit, t]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      broadcastUnreadCount(count);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [autoFetch, fetchNotifications]);

  useEffect(() => {
    if (!notificationEventTarget) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      setUnreadCount(detail);
    };
    notificationEventTarget.addEventListener("unreadCount", handler);
    return () => {
      notificationEventTarget.removeEventListener("unreadCount", handler);
    };
  }, []);

  const markAsRead = async (id: string, options: MarkAsReadOptions = {}) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        syncUnreadCount(updated);
        return updated;
      });
      await refreshUnreadCount();
      if (!options.silent) {
        toast({
          title: t("marked_as_read"),
          description: t("notification_marked_read"),
        });
      }
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || t("error");
      toast({ title: t("error"), description: msg, variant: "destructive" });
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        syncUnreadCount(updated);
        return updated;
      });
      await refreshUnreadCount();
      await fetchNotifications();
      toast({
        title: t("all_read"),
        description: t("all_notifications_read"),
      });
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || t("error");
      toast({ title: t("error"), description: msg, variant: "destructive" });
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        syncUnreadCount(updated);
        return updated;
      });
      await refreshUnreadCount();
      toast({
        title: t("deleted"),
        description: t("notification_deleted"),
      });
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || t("error");
      toast({ title: t("error"), description: msg, variant: "destructive" });
      throw err;
    }
  };

  const clearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      await refreshUnreadCount();
      await fetchNotifications();
      toast({
        title: t("all_cleared"),
        description: t("all_notifications_cleared"),
      });
    } catch (err: ErrorResponse) {
      const msg = err.response?.data?.message || t("error");
      toast({ title: t("error"), description: msg, variant: "destructive" });
      throw err;
    }
  };

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    fetchNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};
