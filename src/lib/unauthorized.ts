import type { Router } from 'vue-router';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import type { Session } from '@/api/session';
import { rememberIntendedRoute } from '@/lib/intended-route';

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

export const handleRoleRequired = (router: Router): void => {
  const session = sessionState.current.value;
  if (!session) return;

  sessionState.replace({ ...(session as Session), active_role: null });

  if (router.currentRoute.value.path !== paths.roleSelection) {
    void router.replace(paths.roleSelection);
  }
};
