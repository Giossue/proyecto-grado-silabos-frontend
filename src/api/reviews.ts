import { api } from "@/api/client";
import type {
  DocumentPresentation,
  IdentificationCell,
  TableLayout,
} from "@/api/syllabi";

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
  can_verify: boolean;
  created_by: string;
  observado_en: string;
  response: {
    content: string;
    responded_by: string;
    responded_at: string;
    revision_number: number | null;
  } | null;
};
export type SnapshotField = {
  key: string;
  label: string;
  type: string;
  inherited: boolean;
  value: unknown;
  rows: Array<{
    id: string;
    position: number;
    data: Record<string, string | number | null>;
  }>;
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
      sections: Array<{
        key: string;
        title: string;
        blocks: Array<{
          key: string;
          title: string;
          content_type: string;
          table: TableLayout | null;
          fields: SnapshotField[];
        }>;
      }>;
    };
    identification: IdentificationCell[][] | null;
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
  reset: { allowed: boolean };
  transfer: {
    allowed: boolean;
    current: Array<{ id: string; nombre: string }>;
    candidates: Array<{ id: string; nombre: string }>;
  };
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
      before: { value: unknown; rows: SnapshotField["rows"] } | null;
      after: { value: unknown; rows: SnapshotField["rows"] } | null;
    }>;
  };
};

export const getReviews = (
  filters: { state?: string; search?: string } = {},
) => {
  const query = new URLSearchParams();
  if (filters.state) query.set("state", filters.state);
  if (filters.search) query.set("search", filters.search);
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
  payload: { observation_ids: string[]; justification: string },
) =>
  api<{ message: string }>(
    `/coordination/reviews/${revisionId}/request-correction`,
    { method: "POST", body: JSON.stringify(payload) },
  );
export const verifyObservation = (observationId: string) =>
  api<{ message: string }>(
    `/coordination/observations/${observationId}/verify`,
    { method: "POST" },
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
export const transferTeacher = (
  syllabusId: string,
  outgoing_user_id: string,
  incoming_user_id: string,
) =>
  api<{ message: string }>(
    `/coordination/syllabi/${syllabusId}/teacher-transfer`,
    {
      method: "POST",
      body: JSON.stringify({
        outgoing_user_id,
        incoming_user_id,
        idempotency_key: crypto.randomUUID(),
      }),
    },
  );
