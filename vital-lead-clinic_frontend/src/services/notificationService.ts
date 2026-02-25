import api from './api';
import type { NotificationItem, NotificationRecord } from '@/types/notifications';

const toIsoString = (value: string | Date | undefined): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toISOString();
};

const mapNotification = (notification: NotificationRecord): NotificationItem => {
  const actionLabel = notification.action_label || undefined;
  const actionLink = notification.action_link || undefined;

  return {
    id: String(notification.id),
    type: notification.type || 'system',
    title: notification.title,
    message: notification.message,
    time: toIsoString(notification.created_at),
    read: Boolean(notification.read),
    actionable: Boolean(actionLabel || actionLink),
    actionLabel,
    actionLink,
    priority: notification.priority || 'medium',
    metadata: notification.metadata || undefined,
  };
};

export const notificationService = {
  getNotifications: async (limit = 50): Promise<NotificationItem[]> => {
    const response = await api.get('/notifications', { params: { limit } });
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map(mapNotification);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.count ?? 0;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read/all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/notifications');
  },
};
