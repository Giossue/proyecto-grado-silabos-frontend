import { api } from "@/api/client";
import type { DocumentPresentation } from "@/api/syllabi";
import type { SignaturePayload, SignatureSummary } from "@/api/signatures";
import type { DocumentField, FieldResponsible } from "@/types/configuration";

export type ReviewStage = "biblioteca" | "coordinacion";
export const REVIEW_STAGE_LABELS: Record<ReviewStage, string> = { biblioteca: "En biblioteca", coordinacion: "En coordinación" };
export const reviewStageLabel = (stage: string | null | undefined): string => (stage && Object.hasOwn(REVIEW_STAGE_LABELS, stage) ? REVIEW_STAGE_LABELS[stage as ReviewStage] : "");

export type ReviewQueueItem = {
  id: string;
  revision_id: string;
  revision_number: number;
  subject: string;
  code: string;
  period: string;
  state: string;
  stage?: ReviewStage | null;
  teachers: string[];
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
export type SnapshotField = DocumentField;
export type SnapshotSection = {
  key: string;
  title: string;
  orientation?: 'portrait' | 'landscape';
  fields: SnapshotField[];
};
export type ReviewDetail = {
  syllabus: {
    id: string;
    subject: string;
    code: string;
    period: string;
    state: string;
    stage?: ReviewStage | null;
    teachers: string[];
  };
  my_stage?: ReviewStage | null;
  can_decide?: boolean;
  can_delete?: boolean;
  signing_statement?: string | null;
  signatures?: SignatureSummary[];
  presentation: DocumentPresentation;
  revision: {
    id: string;
    number: number;
    submitted_at: string;
    submitted_by: string;
    snapshot: {
      schema_version?: number;
      template_variables?: Record<string, string>;
      sections: SnapshotSection[];
    };
    is_current: boolean;
  };
  history: Array<{
    id: string;
    number: number;
    submitted_at: string;
    submitted_by: string;
    library_verified_at?: string | null;
    library_verified_by?: string | null;
    coordination_reviewed_at?: string | null;
    coordination_reviewed_by?: string | null;
    approved_at: string | null;
    approved_by?: string | null;
  }>;
  correction_request: { justification: string; requested_at: string; stage?: ReviewStage; requested_by?: string } | null;
  decisions_allowed: boolean;
  reset: { allowed: boolean };
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
      quien_llena: FieldResponsible;
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
export const requestCorrection = (
  revisionId: string,
  payload: { justification: string },
) =>
  api<{ message: string }>(
    `/coordination/reviews/${revisionId}/request-correction`,
    { method: "POST", body: JSON.stringify(payload) },
  );
export const approveReview = (revisionId: string, signature: SignaturePayload) =>
  api<{ message: string }>(`/coordination/reviews/${revisionId}/approve`, {
    method: "POST",
    body: JSON.stringify({ signature }),
  });
export const deleteSyllabus = (syllabusId: string) =>
  api<{ message: string }>(`/coordination/syllabi/${syllabusId}`, { method: "DELETE" });
export const resetSyllabus = (syllabusId: string) =>
  api<{ message: string }>(`/coordination/syllabi/${syllabusId}/reset`, { method: "POST" });
