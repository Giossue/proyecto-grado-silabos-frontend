import { api } from '@/api/client';

export type SyllabusRow = {
  id: string;
  subject: string;
  code: string;
  convocation: string;
  period: string;
  state: 'sin_iniciar' | 'borrador' | 'en_revision' | 'correccion_solicitada' | 'aprobado';
  completion: number;
  parallels: string[];
  guardado_en: string | null;
};

export type SyllabusPage = {
  data: SyllabusRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type SyllabiResponse = {
  filters: { q: string | null; state: string | null };
  syllabi: SyllabusPage;
};

export const getTeacherSyllabi = (filters: { q?: string; state?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.state && filters.state !== 'all') query.set('state', filters.state);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  return api<SyllabiResponse>(`/teacher/syllabi${suffix}`);
};
