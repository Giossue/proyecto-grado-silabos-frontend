import { api } from '@/api/client';

export type ScreenHelp = { screen: string; title: string; content: string; active: boolean; updated_at: string };

export const getScreenHelp = (screen: string) =>
  api<{ help: ScreenHelp | null }>(`/help?screen=${encodeURIComponent(screen)}`);
export const listScreenHelp = () => api<{ help: ScreenHelp[] }>('/admin/help');
export const saveScreenHelp = (input: { screen: string; title: string; content: string; active: boolean }) =>
  api<{ help: ScreenHelp }>('/admin/help', { method: 'PUT', body: JSON.stringify(input) });
export const deleteScreenHelp = (screen: string) =>
  api<void>('/admin/help', { method: 'DELETE', body: JSON.stringify({ screen }) });
