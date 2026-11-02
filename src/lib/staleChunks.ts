import type { Router } from 'vue-router';
import { navigateTo } from '@/lib/pageReload';

// Cada pantalla se descarga al abrirla. Tras un despliegue, una pestaña abierta hace tiempo pide archivos de la
// versión anterior que ya no existen: la navegación falla en silencio y el menú «no hace nada». En ese caso se
// abre la pantalla pedida con una carga completa, que trae la versión nueva.
const KEY = 'silabos:recarga-por-version';
const RETRY_AFTER_MS = 10_000;

export const isStaleChunkError = (error: unknown): boolean =>
  error instanceof Error
  && /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(error.message);

/** Recarga hacia `target`, pero no dos veces seguidas: si la versión nueva también falla, no entra en bucle. */
export const reloadForNewVersion = (target: string): boolean => {
  const last = Number(sessionStorage.getItem(KEY) ?? 0);
  if (Date.now() - last < RETRY_AFTER_MS) return false;
  sessionStorage.setItem(KEY, String(Date.now()));
  navigateTo(target);

  return true;
};

export const installStaleChunkRecovery = (router: Router): void => {
  router.onError((error, to) => {
    if (isStaleChunkError(error)) reloadForNewVersion(to.fullPath);
  });
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion(window.location.pathname + window.location.search)) event.preventDefault();
  });
};
