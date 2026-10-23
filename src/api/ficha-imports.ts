import { withPurgeConfirmation } from '@/api/career-academics';
import { api } from '@/api/client';

export type FichaTableValue = { columns: string[]; rows: string[][] };
export type FichaProposalValue = string | string[] | FichaTableValue;
export type FichaMissingField = { key: string; label: string; reason: 'sin_contexto' | 'no_encontrado' | 'estructura_invalida' | 'servicio_no_disponible' };

export type FichaImportSubject = {
  subject_id: string;
  code: string;
  name: string;
  cycle: number | null;
  state: 'pendiente' | 'lista' | 'sin_evidencia' | 'fallida';
  values: Record<string, FichaProposalValue>;
  coverage?: { found: number; total: number };
  missing?: FichaMissingField[];
  extraction?: { attempts: number; duration_ms: number } | null;
  replaces: boolean;
  current: Record<string, string>;
};

export type FichaImport = {
  id: string;
  state: 'pendiente' | 'en_ejecucion' | 'lista' | 'fallida' | 'aplicada' | 'descartada';
  error: string | null;
  documents: Array<{ name: string; size: number }>;
  reading: { index: number; total: number; name: string; ocr: string | null; started_at: string } | null;
  progress: { done: number; total: number };
  fields: Array<{ key: string; label: string }>;
  timing?: { started_at?: string; ready_at?: string; reading_ms?: number } | null;
  subjects: FichaImportSubject[];
};

export type FichaImportState = { available: boolean; import: FichaImport | null };

export const getFichaImport = () => api<FichaImportState>('/coordination/ficha-imports');

export const startFichaImport = (files: File[]) => {
  const body = new FormData();
  files.forEach((file) => body.append('files[]', file));

  return api<{ import: FichaImport }>('/coordination/ficha-imports', { method: 'POST', body });
};

export const applyFichaImport = (id: string, subjects: string[], fields?: Record<string, string[]>) =>
  withPurgeConfirmation((confirmPurge) => api<{ message: string }>(`/coordination/ficha-imports/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ subjects, ...(fields ? { fields } : {}), ...(confirmPurge ? { confirm_purge: true } : {}) }),
  }));

export const discardFichaImport = (id: string) =>
  api<{ message: string }>(`/coordination/ficha-imports/${id}`, { method: 'DELETE' });
