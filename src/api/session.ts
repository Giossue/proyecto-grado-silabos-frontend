import { api, initializeCsrfProtection } from '@/api/client';

export type ActiveRole = {
  id: string;
  code: 'administrador' | 'coordinador' | 'docente';
  career_id: string | null;
  career_name: string | null;
};

export type Session = {
  user: { id: string; name: string; email: string; email_verified: boolean; must_change_password: boolean };
  active_role: ActiveRole | null;
  available_roles: ActiveRole[];
};

export type TwoFactorStatus = { enabled: boolean; confirmation_required: boolean };
export type LoginResult = Session | { two_factor_required: true; message: string };

export const getSession = () => api<Session>('/session');
export const login = async (email: string, password: string): Promise<LoginResult> => {
  await initializeCsrfProtection();

  return api<LoginResult>('/authentication/login', { method: 'POST', body: JSON.stringify({ email, password }) });
};
export const completeTwoFactorLogin = async (code: string, recoveryCode: string): Promise<{ message: string }> => {
  await initializeCsrfProtection();

  return api<{ message: string }>('/authentication/two-factor/challenge', {
    method: 'POST',
    body: JSON.stringify({ code: code || undefined, recovery_code: recoveryCode || undefined }),
  });
};
export const requestPasswordRecovery = async (email: string): Promise<{ message: string }> => {
  await initializeCsrfProtection();

  return api<{ message: string }>('/authentication/password-recovery', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};
export const resetForgottenPassword = async (email: string, token: string, password: string, passwordConfirmation: string): Promise<{ message: string }> => {
  await initializeCsrfProtection();

  return api<{ message: string }>('/authentication/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, token, password, password_confirmation: passwordConfirmation }),
  });
};
export const verifyEmail = async (userId: string, hash: string, query: URLSearchParams): Promise<{ message: string }> => {
  await initializeCsrfProtection();

  return api<{ message: string }>(`/authentication/email-verification/${userId}/${hash}?${query.toString()}`, { method: 'POST' });
};
export const resendEmailVerification = () => api<{ message: string }>('/authentication/email-verification/resend', { method: 'POST' });
export const getTwoFactorStatus = () => api<TwoFactorStatus>('/authentication/two-factor');
export const enableTwoFactor = () => api<TwoFactorStatus & { qr_code_svg: string }>('/authentication/two-factor', { method: 'POST' });
export const confirmTwoFactor = (code: string) => api<TwoFactorStatus & { recovery_codes: string[] }>('/authentication/two-factor/confirm', { method: 'POST', body: JSON.stringify({ code }) });
export const disableTwoFactor = () => api<TwoFactorStatus>('/authentication/two-factor', { method: 'DELETE' });
export const logout = () => api<void>('/authentication/logout', { method: 'POST' });
export const selectActiveRole = (roleAssignmentId: string) =>
  api<Session>('/active-role', { method: 'PUT', body: JSON.stringify({ role_assignment_id: roleAssignmentId }) });
export const updatePassword = (password: string, passwordConfirmation: string) =>
  api<Session>('/authentication/password', {
    method: 'PUT',
    body: JSON.stringify({ password, password_confirmation: passwordConfirmation }),
  });
