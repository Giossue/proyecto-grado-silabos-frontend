import { api, apiBlob } from '@/api/client';
import { withPurgeConfirmation } from '@/api/career-academics';

export type CurricularImportStatus = 'pendiente' | 'en_ejecucion' | 'lista' | 'aplicada' | 'fallida';
export type CurricularDefinition = {
  key: string;
  label: string;
  type: 'texto' | 'lista' | 'tabla';
  columns?: Array<{ key: string; label: string }>;
};
export type CurricularProposedValue = {
  id: string;
  concept_key: string;
  subject_id: string | null;
  subject_name: string | null;
  value: string | string[] | Array<Record<string, string>>;
  current_value?: string | string[] | Array<Record<string, string>> | null;
  change?: 'new' | 'unchanged' | 'replace' | null;
  evidence: Array<{ source_id: string; locator: string; quote: string }>;
  issue: string | null;
  issue_code?: 'subject_unmatched' | 'source_conflict' | 'invalid_value' | 'invalid_evidence' | 'conflict' | null;
};
export type CurricularImportSummary = {
  id: string;
  status: CurricularImportStatus;
  created_at: string;
  applied_at: string | null;
  error: string | null;
};
export type ConfirmedCurricularValue = CurricularDefinition & {
  id: string;
  concept_key: string;
  subject_id: string;
  subject_name: string | null;
  subject_code: string | null;
  value: CurricularProposedValue['value'];
  evidence: Array<{ source_name: string; locator: string; quote: string | null }>;
  confirmed_at: string;
  origin: 'importacion' | 'anterior';
};
export type CurricularImportIndex = {
  imports: CurricularImportSummary[];
  subjects: Array<{ id: string; name: string; code: string }>;
  current_values: ConfirmedCurricularValue[];
  concepts: Array<{ key: string; label: string; type: 'texto' | 'lista' | 'tabla'; sections: string[] }>;
  capabilities: { pdf: boolean; xlsx: boolean; extraction: boolean };
  lock_reason: string | null;
};
export type CurricularImportDetail = {
  id: string;
  career_id?: string;
  status: CurricularImportStatus;
  documents: Array<{ source_id: string; name: string; hash: string; kind: string; execution_id: string | null; original_url?: string | null; original_name?: string | null }>;
  proposal: null | {
    definitions: CurricularDefinition[];
    values: CurricularProposedValue[];
    issues: string[];
  };
  fingerprint: string | null;
  error: string | null;
  editable: boolean;
  lock_reason: string | null;
  applied_items?: Array<{ id: string; subject_id: string | null; accept_conflict: boolean }>;
};
export const getCurricularImports = () => api<CurricularImportIndex>('/coordination/curricular-imports');
export const getCurricularImport = (id: string) => api<CurricularImportDetail>(`/coordination/curricular-imports/${id}`);
export const getCurricularImportDocument = (id: string, sourceId: string) => apiBlob(`/coordination/curricular-imports/${id}/documents/${sourceId}/original`);
export const retryCurricularImport = (id: string) => api<CurricularImportDetail>(`/coordination/curricular-imports/${id}/retry`, { method: 'POST' });
export const createCurricularImport = (input: { files: File[]; instruction: string }) => {
  const body = new FormData();
  input.files.forEach((file) => body.append('files[]', file));
  if (input.instruction.trim()) body.append('instruction', input.instruction.trim());
  return api<CurricularImportDetail>('/coordination/curricular-imports', { method: 'POST', body });
};
export const discardCurricularImport = (id: string) => api<{ message: string }>(`/coordination/curricular-imports/${id}`, { method: 'DELETE' });
export const applyCurricularImport = (id: string, input: {
  expected_fingerprint: string;
  confirmed: true;
  items: Array<{ id: string; subject_id?: string; accept_conflict?: true }>;
}) => withPurgeConfirmation((confirm) => api<CurricularImportDetail & { message: string }>(
  `/coordination/curricular-imports/${id}/apply`,
  { method: 'POST', body: JSON.stringify({ ...input, ...(confirm ? { confirm_purge: true } : {}) }) },
));
