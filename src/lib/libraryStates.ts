import type { LibraryReviewState } from '@/api/library';

// Etiqueta de cada envío en la tabla y en el detalle.
export const LIBRARY_STATE_LABELS: Record<LibraryReviewState, string> = {
  pendiente: 'Por revisar',
  por_firmar: 'Por firmar',
  atendido: 'Atendido',
};

// Opciones del filtro de estado.
export const LIBRARY_STATE_FILTERS: Record<LibraryReviewState, string> = {
  pendiente: 'Por revisar',
  por_firmar: 'Por firmar',
  atendido: 'Atendidos',
};

export const libraryStateLabel = (state: string): string =>
  Object.hasOwn(LIBRARY_STATE_LABELS, state) ? LIBRARY_STATE_LABELS[state as LibraryReviewState] : 'Estado no disponible';

export const libraryStateTone = (state: string): 'neutral' | 'info' | 'warning' | 'danger' | 'success' =>
  ({ pendiente: 'warning', por_firmar: 'info', atendido: 'success' } as const)[state as LibraryReviewState] ?? 'neutral';
