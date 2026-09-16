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

export type SyllabusDetail = {
  id: string;
  subject: string;
  code: string;
  convocation: string;
  period: string;
  state: SyllabusRow['state'];
  version_bloqueo: number;
  completion: number;
  parallels: string[];
  teachers: string[];
  sections: Array<{ id: string; title: string; description: string | null; blocks: SyllabusBlock[] }>;
  observations: Array<{ id: string; content: string; state: string; requested: boolean; response: { content: string } | null }>;
};

export type SyllabusField = {
  id: string;
  label: string;
  help: string | null;
  type: string;
  options: Array<{ value: string; label: string }>;
  required: boolean;
  inherited: boolean;
  teacher_editable: boolean;
  value: string | number | null;
};

export type SyllabusBlock = { id: string; title: string | null; fields: SyllabusField[] };

export const getTeacherSyllabi = (filters: { q?: string; state?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.state && filters.state !== 'all') query.set('state', filters.state);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  return api<SyllabiResponse>(`/teacher/syllabi${suffix}`);
};

export const getTeacherSyllabus = (syllabusId: string) => api<{ syllabus: SyllabusDetail }>(`/teacher/syllabi/${syllabusId}`);
export const startTeacherSyllabus = (syllabusId: string) =>
  api<{ message: string; syllabus: SyllabusDetail }>(`/teacher/syllabi/${syllabusId}/start`, { method: 'POST' });
export const saveTeacherField = (syllabusId: string, fieldId: string, version: number, value: unknown) =>
  api<{ version_bloqueo: number; completion: number }>(`/teacher/syllabi/${syllabusId}/fields/${fieldId}`, {
    method: 'PATCH',
    body: JSON.stringify({ version_bloqueo: version, value }),
  });
export const validateTeacherSyllabus = (syllabusId: string) =>
  api<{ message: string; validation: { blocking_errors: number; warnings: number; results: Array<{ message: string }> } }>(`/teacher/syllabi/${syllabusId}/validate`, { method: 'POST' });
export const submitTeacherSyllabus = (syllabusId: string, version: number) =>
  api<{ message: string; syllabus: SyllabusDetail }>(`/teacher/syllabi/${syllabusId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ version_bloqueo: version, idempotency_key: crypto.randomUUID() }),
  });
export const requestAiReview = (syllabusId: string, version: number) => api<{ message: string }>(`/teacher/syllabi/${syllabusId}/ai-review`, { method: 'POST', body: JSON.stringify({ version_bloqueo: version, idempotency_key: crypto.randomUUID() }) });
export const respondObservation = (syllabusId: string, observationId: string, content: string) => api<void>(`/teacher/syllabi/${syllabusId}/observations/${observationId}/response`, { method: 'POST', body: JSON.stringify({ content }) });
