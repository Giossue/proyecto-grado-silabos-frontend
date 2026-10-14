import type { LibraryReviewState } from '@/api/library';

export const LIBRARY_STATE_LABELS: Record<LibraryReviewState, string> = {
  pendiente: 'Por revisar',
  por_firmar: 'Por firmar',
  firmado: 'Firmado',
  comentado: 'Con comentario',
  anulado: 'Anulado',
};

export const libraryStateLabel = (state: string): string =>
  Object.hasOwn(LIBRARY_STATE_LABELS, state) ? LIBRARY_STATE_LABELS[state as LibraryReviewState] : 'Estado no disponible';

export const libraryStateTone = (state: string): 'neutral' | 'info' | 'warning' | 'danger' | 'success' =>
  ({ pendiente: 'warning', por_firmar: 'info', firmado: 'success', comentado: 'danger', anulado: 'neutral' } as const)[state as LibraryReviewState] ?? 'neutral';
