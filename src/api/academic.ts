import { api } from '@/api/client';

export type AcademicGovernance = {
  lock_reason: string | null;
  section: 'faculties' | 'careers' | 'campuses' | 'academic-periods';
  catalogs: {
    faculties: Array<{ id: string; codigo_facultad: string | null; nombre: string; activo: boolean }>;
    campuses: Array<{ id: string; codigo_campus: string | null; nombre: string; activo: boolean }>;
    careers: Array<{ id: string; faculty_id: string; campus_id: string; code: string | null; name: string; modality: string; active: boolean }>;
    periods: Array<{ id: string; code: string; starts_on: string; ends_on: string; teaching_weeks: number; status_label: string }>;
  };
  options: { faculties: Array<{ id: string; nombre: string }>; campuses: Array<{ id: string; nombre: string }> };
};

export const getAcademicGovernance = () => api<AcademicGovernance>('/admin/academic');
export const createAcademicRecord = (entity: string, payload: Record<string, unknown>) =>
  api<{ message: string }>(`/admin/academic/${entity}`, { method: 'POST', body: JSON.stringify(payload) });
