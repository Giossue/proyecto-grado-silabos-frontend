import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebarLayout from '@/layouts/app/AppSidebarLayout.vue';
import { sessionState } from '@/state/session';

const { getNotifications, logout, selectActiveRole } = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  logout: vi.fn(),
  selectActiveRole: vi.fn(),
}));

const { getDashboard } = vi.hoisted(() => ({
  getDashboard: vi.fn(),
}));

vi.mock('@/api/notifications', () => ({ getNotifications }));
vi.mock('@/api/dashboard', () => ({ getDashboard }));
vi.mock('@/api/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api/session')>(),
  logout,
  selectActiveRole,
}));

const administratorSession = {
  user: { id: 'user-1', name: 'Ada Admin', email: 'ada@example.test', email_verified: true, can_edit_identity: true },
  active_role: { id: 'role-1', code: 'administrador' as const, career_id: null, career_name: null },
  available_roles: [
    { id: 'role-1', code: 'administrador' as const, career_id: null, career_name: null },
    { id: 'role-2', code: 'coordinador' as const, career_id: 'career-1', career_name: 'Software' },
  ],
};

const mountedWrappers: Array<{ unmount: () => void }> = [];

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

  const wrapper = mount(AppSidebarLayout, { attachTo: document.body, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
  mountedWrappers.push(wrapper);
  return wrapper;
};

describe('AppSidebarLayout', () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    sessionState.replace(administratorSession);
    getNotifications.mockResolvedValue({ unread_count: 3, filters: { status: 'unread' }, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    getDashboard.mockResolvedValue({ setup: { title: 'Puesta en marcha', intro: '', done: 1, total: 3, steps: [] } });
    logout.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('muestra la navegación del rol y el contador de notificaciones', async () => {
    const wrapper = await mountShell();
    await flushPromises();

    expect(wrapper.text()).toContain('Usuarios');
    expect(wrapper.find('[data-sidebar="sidebar"]').text()).toContain('Panel');
    expect(wrapper.text()).toContain('Configuración');
    expect(wrapper.text()).not.toContain('Mis sílabos');
    expect(wrapper.get('[aria-label="Notificaciones"]').text()).toContain('3');
  });

  it.each([
    'coordinador',
    'docente',
  ] as const)('deja el checklist en el encabezado y retira el Panel del sidebar para %s', async (code) => {
    sessionState.replace({
      ...administratorSession,
      active_role: {
        id: `role-${code}`,
        code,
        career_id: 'career-1',
        career_name: 'Software',
      },
    });
    const wrapper = await mountShell();
    await flushPromises();

    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.text()).not.toContain('Panel');
    expect(sidebar.find('a[href="/dashboard"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(true);
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

    const logoutItem = document.body.querySelector<HTMLElement>('[data-test="logout-button"]');
    expect(logoutItem?.classList.contains('block')).toBe(false);
    expect(logoutItem?.classList.contains('flex')).toBe(true);

    const switchScope = Array.from(
      document.body.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    ).find((item) => item.textContent?.includes('Cambiar carrera o rol'));
    expect(switchScope).toBeDefined();
    switchScope?.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Software');
  });

  it('no presenta Administración cuando todavía no hay un rol activo', async () => {
    sessionState.replace({ ...administratorSession, active_role: null });
    const wrapper = await mountShell();
    await flushPromises();

    const accountButton = wrapper.find('[data-test="sidebar-menu-button"]');
    expect(accountButton.text()).toContain('Sin rol');
    expect(accountButton.text()).not.toContain('Administrador');
  });
});
