import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from '@/components/AppShell.vue';
import { sessionState } from '@/state/session';

const { getNotifications, logout, selectActiveRole } = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  logout: vi.fn(),
  selectActiveRole: vi.fn(),
}));

vi.mock('@/api/notifications', () => ({ getNotifications }));
vi.mock('@/api/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api/session')>(),
  logout,
  selectActiveRole,
}));

const administratorSession = {
  user: { id: 'user-1', name: 'Ada Admin', email: 'ada@example.test', email_verified: true, must_change_password: false },
  active_role: { id: 'role-1', code: 'administrador' as const, career_id: null, career_name: null },
  available_roles: [
    { id: 'role-1', code: 'administrador' as const, career_id: null, career_name: null },
    { id: 'role-2', code: 'coordinador' as const, career_id: 'career-1', career_name: 'Software' },
  ],
};

const mountShell = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/panel', component: { template: '<div />' } },
      { path: '/notificaciones', component: { template: '<div />' } },
      { path: '/seguridad', component: { template: '<div />' } },
      { path: '/administracion/usuarios', component: { template: '<div />' } },
    ],
  });
  await router.push('/panel');
  await router.isReady();

  return mount(AppShell, { attachTo: document.body, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
};

describe('AppShell', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionState.replace(administratorSession);
    getNotifications.mockResolvedValue({ unread_count: 3, filters: { status: 'unread' }, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    logout.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('muestra la navegación del rol y el contador de notificaciones', async () => {
    const wrapper = await mountShell();
    await flushPromises();

    expect(wrapper.text()).toContain('Usuarios');
    expect(wrapper.text()).not.toContain('Mis sílabos');
    expect(wrapper.get('.notification-link').text()).toContain('3');
  });

  it('permite alternar el tema y conserva la preferencia', async () => {
    const wrapper = await mountShell();
    await wrapper.get('[aria-label="Activar tema oscuro"]').trigger('click');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('silabos-theme')).toBe('dark');
  });

  it('contiene el foco del selector de ámbito y lo devuelve al cerrar', async () => {
    const wrapper = await mountShell();
    await wrapper.get('.scope-button').trigger('click');
    await flushPromises();

    const close = wrapper.get('.scope-sheet [aria-label="Cerrar"]');
    expect(document.activeElement).toBe(close.element);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();

    expect(wrapper.find('.scope-sheet').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get('.scope-button').element);
  });
});
