import { api, initializeCsrfProtection } from '@/api/client';

export type ActiveRole = {
  id: string;
  code: 'administrador' | 'coordinador' | 'docente';
  career_id: string | null;
  career_name: string | null;
};

export type Session = {
  user: { id: string; name: string; email: string; must_change_password: boolean };
  active_role: ActiveRole | null;
  available_roles: ActiveRole[];
};

export const getSession = () => api<Session>('/session');
export const login = async (email: string, password: string): Promise<Session> => {
  await initializeCsrfProtection();

  return api<Session>('/authentication/login', { method: 'POST', body: JSON.stringify({ email, password }) });
};
export const logout = () => api<void>('/authentication/logout', { method: 'POST' });
export const selectActiveRole = (roleAssignmentId: string) =>
  api<Session>('/active-role', { method: 'PUT', body: JSON.stringify({ role_assignment_id: roleAssignmentId }) });
