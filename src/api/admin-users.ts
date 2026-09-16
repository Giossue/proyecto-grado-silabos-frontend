import { api } from '@/api/client';

export type ManagedUser = {
  id: string;
  nombre: string;
  correo_electronico: string;
  active: boolean;
  pending_first_login: boolean;
  two_factor_enabled: boolean;
  roles: Array<{ name: string; career_name: string | null }>;
};

export type ManagedUsersResponse = {
  users: { data: ManagedUser[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
  filters: { q: string | null; status: string | null; role: string | null; career: string | null };
  roles: Array<{ codigo: 'administrador' | 'coordinador' | 'docente'; nombre: string }>;
  careers: Array<{ id: string; nombre: string }>;
};

export type ManagedUserDetailResponse = {
  managedUser: {
    id: string; nombre: string; correo_electronico: string; active: boolean;
    assignments: Array<{ id: string; role_code: string; role_name: string; career_id: string | null; career_name: string | null; active: boolean; effective: boolean }>;
  };
  roles: ManagedUsersResponse['roles'];
  careers: ManagedUsersResponse['careers'];
};

export const getManagedUsers = (filters: { q?: string; status?: string; role?: string; career?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== 'all') query.set(key, String(value));
  return api<ManagedUsersResponse>(`/admin/users${query.size ? `?${query}` : ''}`);
};

export const createManagedUser = (payload: { nombre: string; correo_electronico: string; password: string; role_code: string; career_id: string | null }) =>
  api<{ message: string }>('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
export const setManagedUserStatus = (userId: string, active: boolean) =>
  api<{ message: string }>(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ active }) });
export const resendManagedUserAccess = (userId: string) =>
  api<{ message: string }>(`/admin/users/${userId}/resend-access`, { method: 'POST' });
export const deleteManagedUser = (userId: string) => api<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' });
export const getManagedUser = (userId: string) => api<ManagedUserDetailResponse>(`/admin/users/${userId}`);
export const updateManagedUser = (userId: string, payload: { nombre: string; correo_electronico: string; active: boolean }) =>
  api<{ message: string }>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const assignManagedUserRole = (userId: string, payload: { role_code: string; career_id: string | null }) =>
  api<{ message: string }>(`/admin/users/${userId}/roles`, { method: 'POST', body: JSON.stringify(payload) });
