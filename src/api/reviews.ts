import { api } from "@/api/client";
import type { DocumentPresentation } from "@/api/syllabi";
import type { DocumentNode } from "@/lib/templateDocument";

export type ReviewQueueItem = {
  id: string;
  revision_id: string;
  revision_number: number;
  subject: string;
  code: string;
  period: string;
  state: string;
  teachers: string[];
  unresolved_observations: number;
  submitted_at: string;
};
export type ReviewsPage = {
  filters: { state: string; search: string };
  syllabi: {
    data: ReviewQueueItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
  };
};
export type ReviewObservation = {
  id: string;
  revision_number: number;
  section_key: string | null;
  field_key: string | null;
  content: string;
  state: string;
  requested: boolean;
  created_by: string;
  observado_en: string;
};
export type SnapshotField = {
  key: string;
  label: string;
  type: string;
  inherited: boolean;
  value: unknown;
};
export type ReviewDetail = {
  syllabus: {
    id: string;
    subject: string;
    code: string;
    period: string;
    state: string;
    teachers: string[];
  };
  presentation: DocumentPresentation;
  revision: {
    id: string;
    number: number;
    submitted_at: string;
    submitted_by: string;
    snapshot: {
      schema_version?: number;
      template_variables?: Record<string, string>;
      sections: Array<{
        key: string;
        title: string;
        blocks: Array<{
          key: string;
          title: string;
          content_type: string;
          document?: DocumentNode | null;
          fields: SnapshotField[];
        }>;
      }>;
    };
    is_current: boolean;
  };
  history: Array<{
    id: string;
    number: number;
    submitted_at: string;
    submitted_by: string;
    approved_at: string | null;
  }>;
  observations: ReviewObservation[];
  correction_request: { justification: string; requested_at: string } | null;
  /** Falso con la convocatoria cerrada: la revisión queda solo para consulta. */
  decisions_allowed: boolean;
  reset: { allowed: boolean };
  reopening: { cause: string; reopened_at: string; reopened_by: string } | null;
};
export type ReviewComparison = {
  syllabus: { id: string; subject: string; code: string; period: string };
  comparison: {
    before_revision: number;
    after_revision: number;
    changed_fields: number;
    changes: Array<{
      section_key: string;
      section_title: string;
      field_key: string;
      label: string;
      type: string;
      change: "added" | "removed" | "modified";
      before: { value: unknown } | null;
      after: { value: unknown } | null;
    }>;
  };
};

export const getReviews = (
  filters: { state?: string; search?: string; page?: number } = {},
) => {
  const query = new URLSearchParams();
  if (filters.state) query.set("state", filters.state);
  if (filters.search) query.set("search", filters.search);
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  return api<ReviewsPage>(
    `/coordination/reviews${query.size ? `?${query}` : ""}`,
  );
};
export const getReview = (revisionId: string) =>
  api<ReviewDetail>(`/coordination/reviews/${revisionId}`);
export const compareReviews = (beforeId: string, afterId: string) =>
  api<ReviewComparison>(`/coordination/reviews/${beforeId}/compare/${afterId}`);
export const addObservation = (
  revisionId: string,
  payload: { content: string; section_key?: string; field_key?: string },
) =>
  api<{ message: string }>(`/coordination/reviews/${revisionId}/observations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const requestCorrection = (
  revisionId: string,
  payload: { justification: string },
) =>
  api<{ message: string }>(
    `/coordination/reviews/${revisionId}/request-correction`,
    { method: "POST", body: JSON.stringify(payload) },
  );
export const approveReview = (revisionId: string) =>
  api<{ message: string }>(`/coordination/reviews/${revisionId}/approve`, {
    method: "POST",
    body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
  });
export const reopenSyllabus = (syllabusId: string, cause: string) =>
  api<{ message: string }>(`/coordination/syllabi/${syllabusId}/reopen`, {
    method: "POST",
    body: JSON.stringify({ cause, idempotency_key: crypto.randomUUID() }),
  });
export const resetSyllabus = (syllabusId: string, reason: string) =>
  api<{ message: string }>(`/coordination/syllabi/${syllabusId}/reset`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
