import { api } from '@/api/client';

export type AcademicGovernance = {
  lock_reason: string | null;
  section: 'faculties' | 'careers' | 'campuses' | 'academic-periods';
  catalogs: {
    faculties: Array<{ id: string; codigo_facultad: string | null; nombre: string; activo: boolean }>;
    campuses: Array<{ id: string; codigo_campus: string | null; nombre: string; activo: boolean }>;
    careers: Array<{
      id: string;
      faculty_id: string;
      campus_id: string;
      campus_name: string | null;
      code: string | null;
      name: string;
      modality: string;
      modality_label: string | null;
      active: boolean;
      coordinator: { id: string; name: string } | null;
    }>;
    periods: Array<{ id: string; code: string; starts_on: string; ends_on: string; teaching_weeks: number; status_label: string }>;
  };
  options: {
    faculties: Array<{ id: string; nombre: string }>;
    campuses: Array<{ id: string; nombre: string }>;
    coordinatorUsers: Array<{ id: string; nombre: string; correo_electronico: string }>;
  };
};

export type AcademicEntity = 'facultad' | 'campus' | 'carrera' | 'periodo';

export const getAcademicGovernance = () => api<AcademicGovernance>('/admin/academic');
export const createAcademicRecord = (entity: AcademicEntity, payload: Record<string, unknown>) =>
  api<{ message: string }>(`/admin/academic/${entity}`, { method: 'POST', body: JSON.stringify(payload) });
export const updateAcademicRecord = (entity: AcademicEntity, id: string, payload: Record<string, unknown>) =>
  api<{ message: string }>(`/admin/academic/${entity}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const setAcademicRecordStatus = (entity: Exclude<AcademicEntity, 'periodo'>, id: string, active: boolean) =>
  api<{ message: string }>(`/admin/academic/${entity}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) });
export const deleteAcademicRecord = (entity: AcademicEntity, id: string) =>
  api<{ message: string }>(`/admin/academic/${entity}/${id}`, { method: 'DELETE' });
export const replaceCareerCoordinator = (careerId: string, incomingUserId: string, deactivateOutgoing: boolean) =>
  api<{ message: string }>(`/admin/academic/careers/${careerId}/coordinator`, {
    method: 'POST',
    body: JSON.stringify({ incoming_user_id: incomingUserId, deactivate_outgoing: deactivateOutgoing }),
  });
