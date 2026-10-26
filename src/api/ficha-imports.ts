import { withPurgeConfirmation } from '@/api/career-academics';
import { api, apiBlob } from '@/api/client';

export type FichaTableValue = { columns: string[]; rows: string[][] };
export type FichaProposalValue = string | string[] | FichaTableValue;
export type FichaMissingField = { key: string; label: string; reason: 'no_encontrado' };

export type FichaImportSubject = {
  subject_id: string;
  code: string;
  name: string;
  cycle: number | null;
  state: 'lista' | 'sin_evidencia';
  values: Record<string, FichaProposalValue>;
  coverage?: { found: number; total: number };
  missing?: FichaMissingField[];
  replaces: boolean;
  current: Record<string, string>;
};

export type FichaImport = {
  id: string;
  format: 'ficha_xlsx_v1';
  state: 'lista' | 'aplicada' | 'descartada';
  error: string | null;
  documents: Array<{ name: string; size: number }>;
  fields: Array<{ key: string; label: string }>;
  subjects: FichaImportSubject[];
};

export type FichaImportState = { available: boolean; import: FichaImport | null };

export const getFichaImport = () => api<FichaImportState>('/coordination/ficha-imports');

export const applyFichaImport = (id: string, subjects: string[], fields?: Record<string, string[]>) =>
  withPurgeConfirmation((confirmPurge) => api<{ message: string }>(`/coordination/ficha-imports/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ subjects, ...(fields ? { fields } : {}), ...(confirmPurge ? { confirm_purge: true } : {}) }),
  }));

export const discardFichaImport = (id: string) =>
  api<{ message: string }>(`/coordination/ficha-imports/${id}`, { method: 'DELETE' });

export const previewFichaWorkbook = (file: File) => {
  const body = new FormData();
  body.append('file', file);

  return api<{ import: FichaImport }>('/coordination/ficha-imports/spreadsheet', { method: 'POST', body });
};

export const downloadFichaWorkbook = async (): Promise<void> => {
  const url = URL.createObjectURL(await apiBlob('/coordination/ficha-imports/template'));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proyecto-carrera.xlsx';
    link.click();
  } finally { URL.revokeObjectURL(url); }
};
