import { api } from '@/api/client';

export type Notification = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leido_en: string | null;
  notificado_en: string;
  resource_path: string | null;
};

export type NotificationsResponse = {
  filters: { status: 'all' | 'unread' };
  unread_count: number;
  notifications: { data: Notification[]; current_page: number; last_page: number; total: number };
};

export const getNotifications = (status: 'all' | 'unread', page = 1) =>
  api<NotificationsResponse>(`/notifications?status=${status}&page=${page}`);
export const markNotificationRead = (notificationId: string) =>
  api<{ message: string }>(`/notifications/${notificationId}/read`, { method: 'POST' });
export const markAllNotificationsRead = () =>
  api<{ message: string }>('/notifications/read-all', { method: 'POST' });
