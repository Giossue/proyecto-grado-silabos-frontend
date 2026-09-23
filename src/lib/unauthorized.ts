import type { Router } from 'vue-router';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import { rememberIntendedRoute } from '@/lib/intended-route';

/**
 * Reacciona a un 401 de la API. Solo una sesión que existía puede caducar: si no había
 * sesión, el 401 es la respuesta esperada de la sonda `/session` en rutas públicas
 * (activación, restablecimiento, 2FA) y los guards del router ya deciden el destino.
 */
export const handleUnauthorized = (router: Router): void => {
  if (!sessionState.current.value) return;

  const redirect = router.currentRoute.value.fullPath;
  sessionState.clear();
  rememberIntendedRoute(
    redirect,
    router.currentRoute.value.matched.some((record) => record.meta.requiresAuth === true),
  );

  if (router.currentRoute.value.path !== paths.login) {
    void router.replace(paths.login);
  }
};
