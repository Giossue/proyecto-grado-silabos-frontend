import { api } from '@/api/client';
export type Source = { id: string; name: string; description: string | null; has_content: boolean };
export type SourceDetail = { processLock: string | null; source: { id: string; name: string; description: string | null; content: string | null } };
export const getSources = () => api<{ processLock: string | null; sources: Source[] }>('/coordination/sources');
export const createSource = (payload: { nombre: string; description?: string }) => api<{ message: string; source_id: string }>('/coordination/sources', { method: 'POST', body: JSON.stringify(payload) });
export const getSource = (id: string) => api<SourceDetail>(`/coordination/sources/${id}`);
export const updateSource = (id: string, payload: { nombre: string; description?: string }) => api<{ message: string }>(`/coordination/sources/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const updateSourceContent = (id: string, content: string) => api<{ message: string }>(`/coordination/sources/${id}/content`, { method: 'PUT', body: JSON.stringify({ content }) });
