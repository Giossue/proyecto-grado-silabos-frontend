import type { LibraryReviewState } from '@/api/library';

export const LIBRARY_STATE_LABELS: Record<LibraryReviewState, string> = {
  pendiente: 'Por verificar',
  firmado: 'Firmado',
  comentado: 'Con comentario',
  anulado: 'Anulado',
};

export const libraryStateLabel = (state: string): string =>
  Object.hasOwn(LIBRARY_STATE_LABELS, state) ? LIBRARY_STATE_LABELS[state as LibraryReviewState] : 'Estado no disponible';

export const libraryStateVariant = (state: string): 'default' | 'secondary' | 'outline' | 'destructive' =>
  ({ pendiente: 'default', firmado: 'secondary', comentado: 'outline', anulado: 'destructive' } as const)[state as LibraryReviewState] ?? 'outline';
