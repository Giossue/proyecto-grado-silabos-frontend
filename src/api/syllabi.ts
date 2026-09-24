import { api } from "@/api/client";
import type { TemplateAppearance } from "@/api/template";
import type { TableColumnRole } from "@/lib/tableLayout";
import type { DocumentNode } from "@/lib/templateDocument";
import type { AgentAvatarHint } from "@/components/domain/ai/avatar/types";

export type DocumentPresentation = {
  appearance: TemplateAppearance;
  title: string;
  logos: { institution: string; faculty: string };
};

export type IdentificationCell = {
  text: string;
  span: number;
  rows: number;
  style: "blue" | "shade" | "plain";
  bold: boolean;
  small: boolean;
  center: boolean;
};

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
  iniciado_en: string | null;
  parallels: string[];
  guardado_en: string | null;
};

export type SyllabusPage = {
  data: SyllabusRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
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
  /** El docente puede escribir ahora (convocatoria en curso y asignación vigente). */
  editable?: boolean;
  edit_block_reason?: string | null;
  /** Revisión aprobada vigente (solo con el sílabo aprobado); se usa para la firma electrónica. */
  approved_revision_id?: string | null;
  iniciado_en: string | null;
  parallels: string[];
  teachers: string[];
  template_variables?: Record<string, string>;
  planning_expectations?: {
    teaching_weeks: number | null;
    credits: number | string | null;
    total_hours: number | string | null;
    hours_acd: number | string | null;
    hours_ape: number | string | null;
    hours_aa: number | string | null;
  };
  validation?: {
    version_bloqueo: number;
    blocking_errors: number;
    warnings: number;
    results: Array<{ field_id: string | null; code: string; severity: string; message: string }>;
  } | null;
  presentation: DocumentPresentation;
  identification: IdentificationCell[][];
  sections: Array<{
    id: string;
    key: string;
    title: string;
    description: string | null;
    blocks: SyllabusBlock[];
  }>;
  observations: Array<{
    id: string;
    revision_number?: number;
    section_key?: string | null;
    field_key?: string | null;
    content: string;
    state: string;
    requested: boolean;
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
  role: TableColumnRole | null;
};

export type TableLayout = {
  columns: TableColumn[];
  groups: Array<{ key: string; label: string }>;
  bands: Array<{ key: string; label: string }>;
  header_fields: Array<{ key: string; label: string }>;
  totals: { enabled: boolean; label?: string };
  repeat: { enabled: boolean; label?: string };
};

export type SyllabusField = {
  id: string;
  key: string;
  label: string;
  help: string | null;
  type: string;
  options: Array<{ value: string; label: string }>;
  /** «Mostrar solo si»: otra parte de selección y su valor; null es «Siempre». */
  show_when?: { key: string; value: string } | null;
  required: boolean;
  inherited: boolean;
  teacher_editable: boolean;
  ai_enabled: boolean;
  value: string | number | boolean | string[] | null;
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
  /** Pista opcional de expresión declarada por el agente. */
  avatar?: AgentAvatarHint | null;
};

export type AiChat = {
  conversation: {
    id: string;
    hidden: boolean;
    messages: AiChatMessage[];
  } | null;
  suggested_questions: string[];
  available: boolean;
  review: {
    id: string;
    status:
      | "pendiente"
      | "en_ejecucion"
      | "completada"
      | "no_concluyente"
      | "parcial"
      | "fallida";
    draft_version: number;
    stale: boolean;
    total_fields: number;
    completed_fields: number;
    fields_with_recommendations: number;
    failed_fields: number;
    progress: number;
    requested_at: string;
    completed_at: string | null;
    /** Pista opcional de expresión declarada por el agente. */
    avatar?: AgentAvatarHint | null;
  } | null;
  review_results: Array<{
    id: string;
    field_id: string;
    field_label: string;
    section: { id: string; title: string };
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
  page_orientation?: string;
  document?: DocumentNode | null;
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
  api<{ version_bloqueo: number; guardado_en: string | null }>(
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
  api<{ version_bloqueo: number; guardado_en: string | null; rows: RepeatableRow[] }>(
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
      version_bloqueo: number;
      blocking_errors: number;
      warnings: number;
      results: Array<{
        field_id: string | null;
        code: string;
        severity: string;
        message: string;
      }>;
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
  api<{
    message: string;
    review: {
      id: string;
      status: string;
      draft_version: number;
      total_fields: number;
      completed_fields: number;
      progress: number;
    };
  }>(`/teacher/syllabi/${syllabusId}/ai-review`, {
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
