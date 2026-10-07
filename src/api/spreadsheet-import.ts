import { api, apiBlob } from '@/api/client';

export type ImportRow = { line: number; values: Record<string, string>; errors: string[] };
export type ImportResult = { rows: ImportRow[]; valid: boolean; created: number };

export const sendImport = (path: string, file: File, confirm: boolean, extra: Record<string, string> = {}) => {
  const body = new FormData();
  Object.entries(extra).forEach(([key, value]) => body.append(key, value));
  body.append('file', file);
  body.append('confirm', confirm ? '1' : '0');

  return api<ImportResult>(path, { method: 'POST', body });
};

export const downloadImportTemplate = async (path: string, filename: string): Promise<void> => {
  const url = URL.createObjectURL(await apiBlob(path));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
