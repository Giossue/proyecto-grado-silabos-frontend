import { api } from '@/api/client';

export type ConvocationState = 'sin_iniciar' | 'preparacion' | 'abierta' | 'pausada' | 'cerrada';

export type ConvocationItem = {
  id: string | null;
  process_id: string;
  name: string;
  state: ConvocationState;
  process_state: string;
  period: string;
  template: string;
  syllabi_count: number;
};

export type ConvocationsPage = {
  filters: { q: string | null; state: ConvocationState | null };
  available_sources: Array<{ id: string; name: string }>;
  convocations: { data: ConvocationItem[]; current_page: number; last_page: number; per_page: number; from: number | null; to: number | null; total: number };
};

export type ConvocationDetail = {
  convocation: {
    id: string;
    name: string;
    state: ConvocationState;
    process: { name: string; state: string };
    period: string;
    template: string;
    sources: string[];
    start_date: string | null;
    draft_deadline: string | null;
    counts: { total: number; not_started: number; draft: number; in_review: number; approved: number };
    syllabi: Array<{ id: string; subject: string; code: string; state: string; iniciado_en: string | null; parallels: string[]; teachers: string[] }>;
  };
};

export const getConvocations = (filters: { q?: string; state?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.state) query.set('state', filters.state);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  const suffix = query.size ? `?${query.toString()}` : '';
  return api<ConvocationsPage>(`/coordination/convocations${suffix}`);
};

export const createConvocation = (processId: string, sourceIds: string[]) =>
  api<{ message: string; convocation_id: string }>('/coordination/convocations', { method: 'POST', body: JSON.stringify({ process_id: processId, source_ids: sourceIds }) });

export const getConvocation = (convocationId: string) => api<ConvocationDetail>(`/coordination/convocations/${convocationId}`);

export const transitionConvocation = (convocationId: string, transition: 'pausar' | 'reanudar', reason?: string) =>
  api<{ message: string }>(`/coordination/convocations/${convocationId}/${transition}`, {
    method: 'POST', body: JSON.stringify(reason ? { reason } : {}),
  });
