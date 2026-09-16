import { api } from "@/api/client";

export type Curriculum = {
  career: {
    id: string;
    name: string;
    modality: { value: string; label: string } | null;
  };
  curriculum: {
    id: string;
    code: string;
    cycle_count: number;
    editable: boolean;
    lock_reason: string | null;
  };
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    cycle: number;
    position: number | null;
    organization_unit: string;
    modality: string | null;
    credits: number | string;
    total_hours: number | string;
    active: boolean;
    display_fields: Array<{
      id: string;
      label: string;
      value: string | number | null;
    }>;
  }>;
  requirements: Array<{
    id: string;
    subject_id: string;
    requirement_id: string;
    type: string;
  }>;
  modalityOptions: Array<{ value: string; label: string }>;
};

export type ScheduledSubjects = {
  career: { id: string; name: string; lock_reason: string | null };
  selectedPeriodId: string | null;
  scheduledSubjects: Array<{
    id: string;
    subject_id: string;
    period_id: string;
    label: string;
    period_status_label: string;
    campus_name: string;
    modality_name: string;
    parallels: Array<{ id: string; code: string; shift: string | null }>;
    active: boolean;
    editable: boolean;
  }>;
  options: {
    periods: Array<{ id: string; code: string; planning_enabled: boolean }>;
    campuses: Array<{ id: string; nombre: string }>;
    activeSubjects: Array<{
      id: string;
      codigo_asignatura: string;
      nombre: string;
      ciclo: number;
    }>;
  };
};

export type TeacherAssignments = {
  canCreateTeacher: boolean;
  career: { id: string; name: string; lock_reason: string | null };
  teacherAssignments: Array<{
    id: string;
    user_id: string;
    parallel_id: string;
    user_name: string;
    user_email: string;
    parallel_code: string;
    subject_name: string;
    period_name: string;
    active: boolean;
    editable: boolean;
  }>;
  options: {
    parallels: Array<{ id: string; label: string }>;
    teacherUsers: Array<{ id: string; name: string; email: string }>;
  };
};

export const getCurriculum = (careerId: string) =>
  api<Curriculum>(`/coordination/academic/curriculum/${careerId}`);
export const getScheduledSubjects = () =>
  api<ScheduledSubjects>("/coordination/academic/scheduled-subjects");
export const getTeacherAssignments = () =>
  api<TeacherAssignments>("/coordination/academic/teacher-assignments");
export const createCareerRecord = (
  entity: string,
  payload: Record<string, unknown>,
) =>
  api<{ message: string }>(`/coordination/academic/${entity}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const preparePeriod = (payload: Record<string, unknown>) =>
  api<{ message: string }>("/coordination/academic/prepare-period", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const setCareerRecordStatus = (
  entity: string,
  id: string,
  active: boolean,
) =>
  api<{ message: string }>(`/coordination/academic/${entity}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
export const deleteCareerRecord = (entity: string, id: string) =>
  api<{ message: string }>(`/coordination/academic/${entity}/${id}`, {
    method: "DELETE",
  });
export const updateCurriculumConfiguration = (
  careerId: string,
  payload: { code: string; cycle_count: number },
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${careerId}/configuration`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
export const createCareerTeacher = (payload: {
  nombre: string;
  correo_electronico: string;
  password: string;
}) =>
  api<{ message: string }>("/coordination/academic/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const relieveCareerTeacher = (payload: {
  outgoing_user_id: string;
  incoming_user_id: string;
  idempotency_key: string;
}) =>
  api<{ message: string }>("/coordination/academic/relieve-teacher", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const uploadFacultyLogo = (logo: File) => {
  const body = new FormData();
  body.append("logo", logo);
  return api<{ message: string }>("/coordination/faculty-logo", {
    method: "POST",
    body,
  });
};
