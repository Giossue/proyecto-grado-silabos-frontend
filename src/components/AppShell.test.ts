import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebarLayout from '@/layouts/app/AppSidebarLayout.vue';
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
  user: { id: 'user-1', name: 'Ada Admin', email: 'ada@example.test', email_verified: true, must_change_password: false, can_edit_identity: true },
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
      { path: '/configuracion/seguridad', component: { template: '<div />' } },
      { path: '/administracion/usuarios', component: { template: '<div />' } },
      { path: '/administracion/procesos', component: { template: '<div />' } },
      { path: '/administracion/estructura-academica', component: { template: '<div />' } },
      { path: '/administracion/plantilla', component: { template: '<div />' } },
      { path: '/administracion/auditoria', component: { template: '<div />' } },
    ],
  });
  await router.push('/panel');
  await router.isReady();

  return mount(AppSidebarLayout, { attachTo: document.body, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
};

describe('AppSidebarLayout', () => {
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
    expect(wrapper.get('[aria-label="Notificaciones"]').text()).toContain('3');
  });

  it('permite alternar el tema y conserva la preferencia', async () => {
    const wrapper = await mountShell();
    await wrapper.get('[aria-label="Tema visual: Claro. Cambiar a Oscuro"]').trigger('click');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('appearance')).toBe('dark');
  });

  it('expone el cambio de ámbito desde el menú de la cuenta', async () => {
    const wrapper = await mountShell();
    const accountButton = wrapper.findAll('button').find((button) => button.text().includes('Ada Admin'));
    expect(accountButton).toBeDefined();
    await accountButton!.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Cerrar sesión');

    const switchScope = Array.from(
      document.body.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    ).find((item) => item.textContent?.includes('Cambiar carrera o rol'));
    expect(switchScope).toBeDefined();
    switchScope?.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Software');
  });
});
