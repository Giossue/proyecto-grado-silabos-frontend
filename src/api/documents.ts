import { api, apiBlob } from '@/api/client';
export type DocumentsPayload = { syllabus: { id: string; subject: string; code: string; period: string }; revision: { id: string; number: number; approved_at: string; approved_by: string }; artifacts: Array<{ id: string; estado: string; requested_at: string; completed_at: string | null; renderer_label: string; execution: { estado: string; mensaje_error: string | null } | null; files: { docx_size: number | null; pdf_size: number | null } | null }> };
export const getDocuments = (revisionId: string) => api<DocumentsPayload>(`/revisions/${revisionId}/documents`);
export const requestDocuments = (revisionId: string) => api<{ message: string; artifact_id: string }>(`/revisions/${revisionId}/documents`, { method: 'POST', body: JSON.stringify({ idempotency_key: crypto.randomUUID() }) });
export const downloadDocument = (artifactId: string, format: 'docx' | 'pdf') => apiBlob(`/exports/${artifactId}/${format}`);
