import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { handleRoleRequired, handleUnauthorized } from '@/lib/unauthorized';
import { sessionState } from '@/state/session';
import type { Session } from '@/api/session';

const Empty = { template: '<div />' };

const makeRouter = async (start: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: Empty, meta: { guest: true } },
      { path: '/activar-cuenta', component: Empty, meta: { guest: true } },
      { path: '/docente/panel', component: Empty, meta: { requiresAuth: true } },
      { path: '/rol', component: Empty, meta: { requiresAuth: true } },
    ],
  });
  await router.push(start);
  return router;
};

describe('manejo de 401', () => {
  beforeEach(() => sessionState.clear());

  it('no expulsa de una ruta pública cuando nunca hubo sesión', async () => {
    const router = await makeRouter('/activar-cuenta?token=abc');

    handleUnauthorized(router);
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe('/activar-cuenta?token=abc');
  });

  it('envía al login cuando una sesión activa caduca', async () => {
    const router = await makeRouter('/docente/panel');
    sessionState.replace({ user: {} } as unknown as Session);

    handleUnauthorized(router);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe('/login');
    expect(sessionState.current.value).toBeNull();
  });
});

describe('manejo de sesión sin rol', () => {
  beforeEach(() => sessionState.clear());

  it('no hace nada cuando no hay sesión cargada', async () => {
    const router = await makeRouter('/docente/panel');

    handleRoleRequired(router);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe('/docente/panel');
  });

  it('envía a elegir rol y olvida el rol en memoria', async () => {
    const router = await makeRouter('/docente/panel');
    sessionState.replace({ user: {}, active_role: { id: 1 } } as unknown as Session);

    handleRoleRequired(router);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe('/rol');
    expect(sessionState.current.value?.active_role).toBeNull();
  });
});
