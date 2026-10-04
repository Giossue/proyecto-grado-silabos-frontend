import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebarLayout from '@/layouts/app/AppSidebarLayout.vue';
import { curriculumEditorState } from '@/state/curriculumEditor';
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
      { path: '/admin/panel', component: { template: '<div />' } },
      { path: '/notificaciones', component: { template: '<div />' } },
      { path: '/configuracion/seguridad', component: { template: '<div />' } },
      { path: '/administracion/usuarios', component: { template: '<div />' } },
      { path: '/administracion/procesos', component: { template: '<div />' } },
      { path: '/administracion/estructura-academica', component: { template: '<div />' } },
      { path: '/administracion/plantilla', component: { template: '<div />' } },
      { path: '/administracion/auditoria', component: { template: '<div />' } },
    ],
  });
  await router.push('/admin/panel');
  await router.isReady();

  const wrapper = mount(AppSidebarLayout, { attachTo: document.body, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
  mountedWrappers.push(wrapper);
  return wrapper;
};

describe('AppSidebarLayout', () => {
  afterEach(() => {
    curriculumEditorState.setOpen(false);
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    sessionState.replace(administratorSession);
    getNotifications.mockResolvedValue({ unread_count: 3, filters: { status: 'unread' }, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    logout.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('muestra la navegación del rol y el indicador de notificaciones sin leer', async () => {
    const wrapper = await mountShell();
    await flushPromises();

    expect(wrapper.text()).toContain('Usuarios');
    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.text()).toContain('Panel');
    expect(sidebar.get('a[href="/admin/panel"]').attributes('data-active')).toBe('true');
    expect(sidebar.get('a[href="/admin/panel"]').attributes('aria-current')).toBe('page');
    expect(sidebar.text()).not.toContain('Configuración');
    expect(sidebar.find('[aria-label="Menú de usuario"]').exists()).toBe(false);
    expect(wrapper.get('header [aria-label="Menú de usuario"]').text()).toContain('Ada Admin');
    expect(wrapper.text()).not.toContain('Mis sílabos');
    expect(wrapper.find('[aria-label="Asistente curricular"]').exists()).toBe(false);
    const notificationsButton = wrapper.get('[aria-label="Notificaciones sin leer"]');
    expect(notificationsButton.get('[data-slot="badge"]').text()).toBe('');
  });

  it('muestra el Panel de Coordinación en el sidebar', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-coordinador', code: 'coordinador', career_id: 'career-1', career_name: 'Software' },
    });
    const wrapper = await mountShell();
    await flushPromises();

    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.text()).toContain('Panel');
    expect(sidebar.find('a[href="/coordinacion/panel"]').exists()).toBe(true);
    expect(sidebar.text()).not.toContain('Fuentes académicas');
    expect(sidebar.find('a[href="/coordinacion/fuentes"]').exists()).toBe(false);
    expect(sidebar.find('a[href="/coordinacion/proyecto-carrera"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Asistente curricular"]').exists()).toBe(false);
  });

  it('muestra a Biblioteca su panel y su bandeja, sin carrera', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-bibliotecario', code: 'bibliotecario', career_id: null, career_name: null },
    });
    const wrapper = await mountShell();
    await flushPromises();

    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.find('a[href="/biblioteca/panel"]').text()).toContain('Panel');
    expect(sidebar.get('a[href="/biblioteca/revisiones"]').text()).toContain('Revisiones de biblioteca');
    expect(sidebar.find('a[href="/biblioteca/configuracion/perfil"]').exists()).toBe(false);
    expect(sidebar.text()).not.toContain('Mis sílabos');
    expect(sidebar.text()).not.toContain('Usuarios y roles');
    expect(wrapper.get('header [aria-label="Menú de usuario"]').text()).not.toContain('Bibliotecario');
  });

  it('muestra la cuenta en el encabezado y retira el acceso al Panel para docente', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-docente', code: 'docente', career_id: 'career-1', career_name: 'Software' },
    });
    const wrapper = await mountShell();
    await flushPromises();

    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.text()).not.toContain('Panel');
    expect(sidebar.find('a[href="/dashboard"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(false);
    expect(wrapper.get('header [aria-label="Menú de usuario"]').text()).not.toContain('Software');
    expect(wrapper.find('header [role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Asistente curricular"]').exists()).toBe(false);
  });

  it('permite alternar el tema y conserva la preferencia', async () => {
    const wrapper = await mountShell();
    await wrapper.get('[aria-label="Tema visual: Claro. Cambiar a Oscuro"]').trigger('click');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('appearance')).toBe('dark');
  });

  it('oculta sidebar y encabezado global durante la edición de malla', async () => {
    const wrapper = await mountShell();
    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-sidebar="trigger"]').exists()).toBe(true);

    curriculumEditorState.setOpen(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(false);
    expect(wrapper.find('[data-sidebar="trigger"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Contenido');

    curriculumEditorState.setOpen(false);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(true);
    expect(wrapper.find('[data-sidebar="trigger"]').exists()).toBe(true);
  });

  it('expone el cambio de ámbito desde el menú de la cuenta', async () => {
    const wrapper = await mountShell();
    const accountButton = wrapper.get('header [aria-label="Menú de usuario"]');
    await accountButton.trigger('click');
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

    const accountButton = wrapper.get('header [aria-label="Menú de usuario"]');
    expect(accountButton.text()).not.toContain('Administrador');
  });
});
