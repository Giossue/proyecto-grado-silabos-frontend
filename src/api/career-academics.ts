import { api } from "@/api/client";

export type Curriculum = {
  career: {
    id: string;
    name: string;
    modality: { value: string; label: string } | null;
  };
  curriculum: {
    id: string;
    cycle_count: number;
    editable: boolean;
    lock_reason: string | null;
  };
  fixedFields: Array<{
    id: string;
    key: string;
    label: string;
    type: "texto" | "numero" | "entero" | "booleano";
    system_key: string;
    system_label: string;
    position: number;
    visible_on_card: boolean;
    totalizable: boolean;
  }>;
  fixedFieldTotals: Array<{ id: string; label: string; value: number }>;
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    cycle: number | null;
    position: number;
    organization_unit: string | null;
    modality: string | null;
    modality_label: string | null;
    credits: string | null;
    total_hours: number | null;
    active: boolean;
    system_values: Record<string, number | string | null>;
    display_fields: Array<{
      id: string;
      label: string;
      value: string | number | boolean | null;
    }>;
  }>;
  requirements: Array<{
    id: string;
    subject_id: string;
    requirement_id: string;
    type: "prerrequisito" | "correquisito";
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
    subject_code: string;
    subject_name: string;
    subject_cycle: number | null;
    period_starts_on: string;
    period_ends_on: string;
    period_status: "proximo" | "en_curso" | "finalizado";
    period_status_label: string;
    period_planning_enabled: boolean;
    campus_name: string;
    modality_name: string;
    parallels: Array<{ id: string; code: string; shift: string | null }>;
    active: boolean;
    editable: boolean;
  }>;
  options: {
    periods: Array<{
      id: string;
      code: string;
      starts_on: string;
      ends_on: string;
      status: "proximo" | "en_curso" | "finalizado";
      status_label: string;
      planning_enabled: boolean;
    }>;
    activeSubjects: Array<{
      id: string;
      codigo_asignatura: string;
      nombre: string;
      ciclo: number;
    }>;
    scheduledSubjects: Array<{
      id: string;
      label: string;
      subject_id: string;
      period_id: string;
    }>;
  };
};

export type TeacherAssignments = {
  canCreateTeacher: boolean;
  career: { id: string; name: string; lock_reason: string | null };
  pendingTeachers: Array<{ id: string; name: string; email: string }>;
  teacherAssignments: Array<{
    id: string;
    user_id: string;
    parallel_id: string;
    user_name: string;
    user_email: string;
    parallel_code: string;
    subject_name: string;
    period_name: string;
    period_status: "proximo" | "en_curso" | "finalizado";
    period_planning_enabled: boolean;
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
export const getScheduledSubjects = (periodId?: string) => {
  const query = periodId ? `?period=${encodeURIComponent(periodId)}` : "";

  return api<ScheduledSubjects>(
    `/coordination/academic/scheduled-subjects${query}`,
  );
};
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
  payload: { cycle_count: number },
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${careerId}/configuration`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
export const updateSubjectLayout = (
  curriculumId: string,
  payload: { subject_id: string; cycle: number; position: number },
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${curriculumId}/subject-layout`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
export const updateCareerRecord = (
  entity: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  api<{ message: string }>(`/coordination/academic/${entity}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const createSubjectRequirement = (
  curriculumId: string,
  payload: {
    subject_id: string;
    requirement_id: string;
    type: "prerrequisito" | "correquisito";
  },
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${curriculumId}/requirements`,
    { method: "POST", body: JSON.stringify(payload) },
  );
export const deleteSubjectRequirement = (
  curriculumId: string,
  requirementId: string,
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${curriculumId}/requirements/${requirementId}`,
    { method: "DELETE" },
  );
export const deleteCurriculumSubject = (
  curriculumId: string,
  subjectId: string,
) =>
  api<{ message: string }>(
    `/coordination/academic/curriculum/${curriculumId}/subjects/${subjectId}`,
    { method: "DELETE" },
  );
export const createParallels = (payload: {
  scheduled_subject_id: string;
  codes: string[];
  shift: string | null;
}) =>
  api<{ message: string }>("/coordination/academic/parallels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const deleteScheduledSubject = (id: string) =>
  api<{ message: string }>(`/coordination/academic/scheduled-subjects/${id}`, {
    method: "DELETE",
  });
export const createCareerTeacher = (payload: {
  nombre: string;
  correo_electronico: string;
}) =>
  api<{ message: string }>("/coordination/academic/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const resendCareerTeacherInvitation = (userId: string) =>
  api<{ message: string }>(`/coordination/academic/teachers/${userId}/resend-activation`, {
    method: "POST",
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
