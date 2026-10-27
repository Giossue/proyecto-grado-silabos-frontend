import { api } from '@/api/client';
import type { SnapshotSection } from '@/api/reviews';
import type { PaginationMeta } from '@/types/pagination';

export type LibraryReviewState = 'pendiente' | 'por_firmar' | 'firmado' | 'comentado' | 'anulado';

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
  can_verify: boolean;
  verified_at: string | null;
  verified_by: string | null;
  template_variables: Record<string, string>;
  sections: SnapshotSection[];
  comments: LibraryComment[];
  comment_reasons: Array<{ code: string; label: string }>;
};

export type LibraryReviewsPage = {
  filters: { state: string | null; q: string | null; faculty?: string | null };
  faculties?: Array<{ id: string; name: string }>;
  reviews: PaginationMeta & { data: LibraryReviewItem[] };
};

export const getLibraryReviews = (filters: { state?: string; q?: string; faculty?: string; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.state && filters.state !== 'all') query.set('state', filters.state);
  if (filters.faculty && filters.faculty !== 'all') query.set('faculty', filters.faculty);
  if (filters.q) query.set('q', filters.q);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  return api<LibraryReviewsPage>(`/library/reviews${query.size ? `?${query}` : ''}`);
};

export type LibraryHistoryPage = LibraryReviewsPage & { periods: Array<{ id: string; code: string }> };

export const getLibraryHistory = (filters: { state?: string; q?: string; faculty?: string; period?: string; mine?: boolean; page?: number } = {}) => {
  const query = new URLSearchParams();
  if (filters.state && filters.state !== 'all') query.set('state', filters.state);
  if (filters.q) query.set('q', filters.q);
  if (filters.faculty && filters.faculty !== 'all') query.set('faculty', filters.faculty);
  if (filters.period && filters.period !== 'all') query.set('period', filters.period);
  if (filters.mine) query.set('mine', '1');
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));
  return api<LibraryHistoryPage>(`/library/history${query.size ? `?${query}` : ''}`);
};

export const getLibraryReview = (revisionId: string) =>
  api<{ review: LibraryReviewDetail }>(`/library/reviews/${revisionId}`);

export const commentLibraryReview = (revisionId: string, payload: { reasons: string[]; other?: string }) =>
  api<{ message: string }>(`/library/reviews/${revisionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const verifyLibraryReview = (revisionId: string) =>
  api<{ message: string }>(`/library/reviews/${revisionId}/verify`, { method: 'POST' });
