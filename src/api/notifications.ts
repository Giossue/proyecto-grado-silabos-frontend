import { api } from '@/api/client';

export type Notification = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leido_en: string | null;
  notificado_en: string;
  /** El servidor sabe a qué pantalla y con cuál de sus roles se abre el aviso (I-121). */
  has_destination: boolean;
  /** Ámbito en que se abrirá, p. ej. «Coordinación · Software». */
  context: string | null;
};

export type OpenedNotification = { path: string | null; role_changed: boolean; message?: string };

export type NotificationsResponse = {
  filters: { status: 'all' | 'unread' };
  unread_count: number;
  notifications: { data: Notification[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
};

export const getNotifications = (status: 'all' | 'unread', page = 1) =>
  api<NotificationsResponse>(`/notifications?status=${status}&page=${page}`);
export const markNotificationRead = (notificationId: string) =>
  api<{ message: string }>(`/notifications/${notificationId}/read`, { method: 'POST' });
/** Marca el aviso como leído y, si hace falta, activa en el servidor el rol que le corresponde. */
export const openNotification = (notificationId: string) =>
  api<OpenedNotification>(`/notifications/${notificationId}/open`, { method: 'POST' });
export const markAllNotificationsRead = () =>
  api<{ message: string }>('/notifications/read-all', { method: 'POST' });
