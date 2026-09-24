import { api } from '@/api/client';

export type SyllabusProcess = {
  id: string;
  name: string;
  state: 'abierto' | 'pausado' | 'cerrado';
  template: string;
  period_id: string;
  period_name: string;
  starts_at: string;
  due_at: string;
  convocations_count: number;
  configurable: boolean;
  deletable: boolean;
};

export type Processes = {
  processes: SyllabusProcess[];
  template: string | null;
  periods: Array<{ id: string; codigo: string }>;
  active_process: { name: string; period: string; state: string } | null;
};

export type ProcessPayload = {
  period_id: string;
  starts_at: string;
  due_at: string;
};

export const getProcesses = () => api<Processes>('/admin/processes');

export const createProcess = (payload: ProcessPayload) =>
  api<{ message: string }>('/admin/processes', { method: 'POST', body: JSON.stringify(payload) });

export const deleteProcess = (processId: string) =>
  api<{ message: string }>(`/admin/processes/${processId}`, { method: 'DELETE' });

export const transitionProcess = (processId: string, transition: 'pausar' | 'reanudar' | 'cerrar', reason?: string) =>
  api<{ message: string }>(`/admin/processes/${processId}/${transition}`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });

export const extendProcessDeadline = (processId: string, payload: { due_at: string; reason: string }) =>
  api<{ message: string }>(`/admin/processes/${processId}/deadline`, { method: 'POST', body: JSON.stringify(payload) });
