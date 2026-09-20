import { api } from '@/api/client';
export type SourceIngestionStatus = 'manual' | 'pendiente' | 'en_ejecucion' | 'completada' | 'fallida';
export type SourceDocumentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null | number[] | string[]>;
  marks?: Array<{ type: string; attrs?: Record<string, string | null> }>;
  content?: SourceDocumentNode[];
};
export type SourceDocument = SourceDocumentNode & { schemaVersion: 1; type: 'doc'; content: SourceDocumentNode[] };
export const emptySourceDocument = (): SourceDocument => ({ schemaVersion: 1, type: 'doc', content: [] });
export type Source = { id: string; name: string; description: string | null; has_content: boolean; ingestion_status: SourceIngestionStatus; execution_id: string | null };
export type SourceDetail = {
  processLock: string | null;
  source: {
    id: string;
    name: string;
    description: string | null;
    document: SourceDocument;
    document_schema_version: number;
    ingestion: {
      status: SourceIngestionStatus;
      execution_id: string | null;
      model: string | null;
      requested_at: string | null;
      completed_at: string | null;
      error_code: string | null;
    };
  };
};
export const getSources = () => api<{ processLock: string | null; sources: Source[] }>('/coordination/sources');
export const createSource = (payload: { nombre: string; description?: string }) => api<{ message: string; source_id: string }>('/coordination/sources', { method: 'POST', body: JSON.stringify(payload) });
export const getSource = (id: string) => api<SourceDetail>(`/coordination/sources/${id}`);
export const updateSource = (id: string, payload: { nombre: string; description?: string }) => api<{ message: string }>(`/coordination/sources/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteSource = (id: string) => api<{ message: string }>(`/coordination/sources/${id}`, { method: 'DELETE' });
export const updateSourceContent = (id: string, document: SourceDocument) => api<{ message: string }>(`/coordination/sources/${id}/content`, { method: 'PUT', body: JSON.stringify({ document }) });
export const ingestSourcePdf = (id: string, file: File) => {
  const body = new FormData();
  body.append('pdf', file);

  return api<{ message: string; execution_id: string; status: SourceIngestionStatus }>(`/coordination/sources/${id}/pdf`, {
    method: 'POST',
    body,
  });
};
