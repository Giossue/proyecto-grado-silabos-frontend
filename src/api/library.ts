import { api } from '@/api/client';
import type { SnapshotSection } from '@/api/reviews';
import type { PaginationMeta } from '@/types/pagination';

export type LibraryReviewState = 'pendiente' | 'firmado' | 'comentado' | 'anulado';

export type LibraryReviewItem = {
  revision_id: string;
  syllabus_id: string;
  subject: string;
  code: string;
  career: string;
  period: string;
  parallels: string[];
  teachers: string[];
  revision_number: number;
  sent_at: string;
  sent_by: string;
  state: LibraryReviewState;
};

export type LibraryComment = {
  comment: string;
  commented_at: string;
  commented_by: string;
  revision_number: number;
};

export type LibraryReviewDetail = LibraryReviewItem & {
  can_comment: boolean;
  template_variables: Record<string, string>;
  sections: SnapshotSection[];
  comments: LibraryComment[];
};

export type LibraryReviewsPage = {
  filters: { state: string | null; q: string | null };
  reviews: PaginationMeta & { data: LibraryReviewItem[] };
};

export const getLibraryReviews = (filters: { state?: string; q?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.state && filters.state !== 'all') query.set('state', filters.state);
  if (filters.q) query.set('q', filters.q);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  return api<LibraryReviewsPage>(`/library/reviews${query.size ? `?${query}` : ''}`);
};

export const getLibraryReview = (revisionId: string) =>
  api<{ review: LibraryReviewDetail }>(`/library/reviews/${revisionId}`);

export const commentLibraryReview = (revisionId: string, payload: { comment: string; idempotency_key: string }) =>
  api<{ message: string }>(`/library/reviews/${revisionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
