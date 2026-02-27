export type NotificationType = 'lead' | 'system' | 'alert' | 'success' | 'reminder';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationMetadata {
  leadId?: string | number;
  leadName?: string;
  value?: number;
  [key: string]: any;
}

export interface MarkAsReadOptions {
  silent?: boolean;
}

// Raw API shape from backend (snake_case)
export interface NotificationRecord {
  id: string | number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  action_label?: string | null;
  action_link?: string | null;
  metadata?: NotificationMetadata | null;
  read: boolean;
  user_id?: string | number | null;
  clinic_id?: string | number | null;
  created_at: string | Date;
}

// UI shape used by components
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionable: boolean;
  actionLabel?: string;
  actionLink?: string;
  priority: NotificationPriority;
  metadata?: NotificationMetadata;
}

export interface NotificationsState {
  notifications: NotificationItem[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (id: string, options?: MarkAsReadOptions) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}
