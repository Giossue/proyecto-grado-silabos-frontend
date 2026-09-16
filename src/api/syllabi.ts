import { api } from "@/api/client";

export type SyllabusRow = {
  id: string;
  subject: string;
  code: string;
  convocation: string;
  period: string;
  state:
    | "sin_iniciar"
    | "borrador"
    | "en_revision"
    | "correccion_solicitada"
    | "aprobado";
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
  state: SyllabusRow["state"];
  version_bloqueo: number;
  completion: number;
  parallels: string[];
  teachers: string[];
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    blocks: SyllabusBlock[];
  }>;
  observations: Array<{
    id: string;
    content: string;
    state: string;
    requested: boolean;
    response: { content: string } | null;
  }>;
};

export type RepeatableRow = {
  id?: string;
  data: Record<string, string | number | null>;
  position: number;
};

export type TableColumn = {
  key: string;
  label: string;
  type: "text" | "number";
  group: string | null;
  band: string | null;
  sum: boolean;
  width: number | null;
  role: string | null;
};

export type TableLayout = {
  columns: TableColumn[];
  groups: Array<{ key: string; label: string }>;
  bands: Array<{ key: string; label: string }>;
  header_fields: Array<{ key: string; label: string }>;
  totals: { enabled: boolean; label: string };
  repeat: { enabled: boolean; label: string };
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
  ai_enabled: boolean;
  value: string | number | null;
  rows: RepeatableRow[];
};

export type AiRecommendation = {
  id: string;
  type: string;
  title: string;
  explanation: string;
  suggested_text: string;
  evidence_ids: string[];
  my_decisions: string[];
  applied: boolean;
};

export type AiFieldAnalysis = {
  syllabus: {
    id: string;
    subject: string;
    state: string;
    version_bloqueo: number;
  };
  field: { id: string; key: string; label: string; content: string };
  environment: { is_provisional_simulator: boolean };
  executions: Array<{
    id: string;
    status: string;
    requested_at: string;
    completed_at: string | null;
    analysis_label: string;
    input_content: string;
    reason: string | null;
    mensaje_error: string | null;
    evidence: Array<{ id: string; source: string; excerpt: string }>;
    recommendations: AiRecommendation[];
  }>;
};

export type AiChatCitation = {
  id: string;
  type: "seccion_silabo" | "fuente_academica";
  field_id: string | null;
  source_id: string | null;
  label: string;
  excerpt: string;
};

export type AiChatMessage = {
  id: string;
  role: "usuario" | "asistente";
  status: "completado" | "pendiente" | "en_ejecucion" | "fallido";
  content: string;
  draft_version: number;
  error: string | null;
  created_at: string;
  citations: AiChatCitation[];
};

export type AiChat = {
  conversation: {
    id: string;
    hidden: boolean;
    messages: AiChatMessage[];
  } | null;
  suggested_questions: string[];
  available: boolean;
  review_results: Array<{
    id: string;
    field_id: string;
    field_label: string;
    status: string;
    stale: boolean;
    reason: string | null;
    error: string | null;
    recommendations: Array<{
      id: string;
      title: string;
      explanation: string;
      suggested_text: string;
      applied: boolean;
      decisions: string[];
      citations: Array<{ id: string; label: string; excerpt: string }>;
    }>;
  }>;
};

export type SyllabusBlock = {
  id: string;
  title: string | null;
  content_type: string;
  table: TableLayout | null;
  fields: SyllabusField[];
};

export const getTeacherSyllabi = (
  filters: { q?: string; state?: string; page?: number } = {},
) => {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.state && filters.state !== "all")
    query.set("state", filters.state);
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return api<SyllabiResponse>(`/teacher/syllabi${suffix}`);
};

export const getTeacherSyllabus = (syllabusId: string) =>
  api<{ syllabus: SyllabusDetail }>(`/teacher/syllabi/${syllabusId}`);
export const startTeacherSyllabus = (syllabusId: string) =>
  api<{ message: string; syllabus: SyllabusDetail }>(
    `/teacher/syllabi/${syllabusId}/start`,
    { method: "POST" },
  );
export const saveTeacherField = (
  syllabusId: string,
  fieldId: string,
  version: number,
  value: unknown,
) =>
  api<{ version_bloqueo: number; completion: number }>(
    `/teacher/syllabi/${syllabusId}/fields/${fieldId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ version_bloqueo: version, value }),
    },
  );
export const saveTeacherRows = (
  syllabusId: string,
  fieldId: string,
  version: number,
  rows: RepeatableRow[],
) =>
  api<{ version_bloqueo: number; completion: number; rows: RepeatableRow[] }>(
    `/teacher/syllabi/${syllabusId}/fields/${fieldId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ version_bloqueo: version, rows }),
    },
  );
export const validateTeacherSyllabus = (syllabusId: string) =>
  api<{
    message: string;
    validation: {
      blocking_errors: number;
      warnings: number;
      results: Array<{ message: string }>;
    };
  }>(`/teacher/syllabi/${syllabusId}/validate`, { method: "POST" });
export const submitTeacherSyllabus = (syllabusId: string, version: number) =>
  api<{ message: string; syllabus: SyllabusDetail }>(
    `/teacher/syllabi/${syllabusId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({
        version_bloqueo: version,
        idempotency_key: crypto.randomUUID(),
      }),
    },
  );
export const requestAiReview = (syllabusId: string, version: number) =>
  api<{ message: string }>(`/teacher/syllabi/${syllabusId}/ai-review`, {
    method: "POST",
    body: JSON.stringify({
      version_bloqueo: version,
      idempotency_key: crypto.randomUUID(),
    }),
  });
export const getFieldAiAnalysis = (syllabusId: string, fieldId: string) =>
  api<AiFieldAnalysis>(`/teacher/syllabi/${syllabusId}/fields/${fieldId}/ai`);
export const requestFieldAiAnalysis = (syllabusId: string, fieldId: string) =>
  api<{ message: string }>(
    `/teacher/syllabi/${syllabusId}/fields/${fieldId}/ai`,
    {
      method: "POST",
      body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
    },
  );
export const decideAiRecommendation = (
  syllabusId: string,
  fieldId: string,
  recommendationId: string,
  decision: "aceptada" | "ignorada" | "no_util",
) =>
  api<{ message: string }>(
    `/teacher/syllabi/${syllabusId}/fields/${fieldId}/ai/${recommendationId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    },
  );
export const applyAiRecommendation = (
  syllabusId: string,
  fieldId: string,
  recommendationId: string,
  version: number,
) =>
  api<{
    message: string;
    version_bloqueo: number;
    completion: number;
    value: string;
  }>(
    `/teacher/syllabi/${syllabusId}/fields/${fieldId}/ai/${recommendationId}/apply`,
    {
      method: "POST",
      body: JSON.stringify({ version_bloqueo: version }),
    },
  );
export const getAiChat = (syllabusId: string) =>
  api<AiChat>(`/teacher/syllabi/${syllabusId}/ai-chat`);
export const sendAiChatMessage = (syllabusId: string, message: string) =>
  api<{ message: string; assistant_message_id: string }>(
    `/teacher/syllabi/${syllabusId}/ai-chat/messages`,
    {
      method: "POST",
      body: JSON.stringify({ message, idempotency_key: crypto.randomUUID() }),
    },
  );
export const clearAiChat = (syllabusId: string) =>
  api<{ message: string }>(`/teacher/syllabi/${syllabusId}/ai-chat`, {
    method: "DELETE",
  });
export const respondObservation = (
  syllabusId: string,
  observationId: string,
  content: string,
) =>
  api<void>(
    `/teacher/syllabi/${syllabusId}/observations/${observationId}/response`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
