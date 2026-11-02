import type { LibraryReviewItem } from '@/api/library';

type LibraryStatus = 'pendiente' | 'firmado' | 'devuelto' | 'reemplazado';
type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

// Cómo se muestra cada envío en la tabla y en el detalle: Por revisar, Aceptado o Devuelto.
const LABELS: Record<LibraryStatus, string> = {
  pendiente: 'Por revisar',
  firmado: 'Aceptado',
  devuelto: 'Devuelto',
  reemplazado: 'Reemplazado',
};
const TONES: Record<LibraryStatus, Tone> = { pendiente: 'warning', firmado: 'success', devuelto: 'danger', reemplazado: 'neutral' };

// Opciones del filtro de estado.
export const LIBRARY_STATE_FILTERS: Record<'pendiente' | 'firmado' | 'devuelto', string> = {
  pendiente: 'Por revisar',
  firmado: 'Aceptados',
  devuelto: 'Devueltos',
};

/** El estado visible: «Por revisar» mientras está pendiente; después, cómo terminó. */
export const libraryStatus = (item: Pick<LibraryReviewItem, 'state' | 'outcome'>): LibraryStatus =>
  item.state === 'pendiente' || item.outcome === null ? 'pendiente' : item.outcome;

export const libraryStatusLabel = (status: string): string =>
  Object.hasOwn(LABELS, status) ? LABELS[status as LibraryStatus] : 'Estado no disponible';

export const libraryStatusTone = (status: string): Tone =>
  Object.hasOwn(TONES, status) ? TONES[status as LibraryStatus] : 'neutral';
