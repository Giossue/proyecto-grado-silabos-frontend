import { api } from '@/api/client';

export type ManagedUser = {
  id: string;
  nombre: string;
  correo_electronico: string;
  active: boolean;
  pending_activation: boolean;
  two_factor_enabled: boolean;
  roles: Array<{ code: 'administrador' | 'coordinador' | 'docente'; name: string; career_name: string | null }>;
  careers: Array<string | null>;
  assignments: Array<{ id: string; role_name: string; career_name: string | null; active: boolean }>;
};

export type ManagedUsersResponse = {
  users: { data: ManagedUser[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
  filters: { q: string | null; status: string | null; role: string | null; career: string | null };
  roles: Array<{ codigo: 'administrador' | 'coordinador' | 'docente'; nombre: string }>;
  careers: Array<{ id: string; nombre: string }>;
};

export const getManagedUsers = (filters: { q?: string; status?: string; role?: string; career?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== 'all') query.set(key, String(value));
  return api<ManagedUsersResponse>(`/admin/users${query.size ? `?${query}` : ''}`);
};

export const createManagedUser = (payload: { nombre: string; correo_electronico: string; role_code: string; career_id: string | null }) =>
  api<{ message: string }>('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
export const resendManagedUserInvitation = (userId: string) =>
  api<{ message: string }>(`/admin/users/${userId}/resend-activation`, { method: 'POST' });
export const deleteManagedUser = (userId: string) => api<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' });
export const updateManagedUser = (userId: string, payload: { nombre: string; correo_electronico: string; active?: boolean; role_code?: string; career_id?: string | null }) =>
  api<{ message: string }>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
