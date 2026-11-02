import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebarLayout from '@/layouts/app/AppSidebarLayout.vue';
import { curriculumEditorState } from '@/state/curriculumEditor';
import { sessionState } from '@/state/session';

const { getDeadline, getNotifications, leaveActiveRole, logout, selectActiveRole } = vi.hoisted(() => ({
  getDeadline: vi.fn(),
  getNotifications: vi.fn(),
  leaveActiveRole: vi.fn(),
  logout: vi.fn(),
  selectActiveRole: vi.fn(),
}));

vi.mock('@/api/notifications', () => ({ getNotifications }));
vi.mock('@/api/dashboard', () => ({ getDeadline }));
vi.mock('@/api/session', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api/session')>(),
  leaveActiveRole,
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
      { path: '/rol', component: { template: '<div />' } },
      { path: '/admin/convocatorias', component: { template: '<div />' } },
      { path: '/docente/mis-silabos', component: { template: '<div />' } },
      { path: '/notificaciones', component: { template: '<div />' } },
      { path: '/configuracion/seguridad', component: { template: '<div />' } },
      { path: '/administracion/usuarios', component: { template: '<div />' } },
      { path: '/administracion/procesos', component: { template: '<div />' } },
      { path: '/administracion/estructura-academica', component: { template: '<div />' } },
      { path: '/administracion/plantilla', component: { template: '<div />' } },
      { path: '/administracion/auditoria', component: { template: '<div />' } },
    ],
  });
  await router.push('/admin/convocatorias');
  await router.isReady();

  const wrapper = mount(AppSidebarLayout, { attachTo: document.body, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
  mountedWrappers.push(wrapper);
  return wrapper;
};

describe('AppSidebarLayout', () => {
  it('muestra el aviso de plazo bajo la barra superior en cualquier pantalla del coordinador, y no a Administración', async () => {
    getDeadline.mockResolvedValue({ deadline: { period: '2026-2027', starts_at: '2026-10-26', due_at: '2026-10-30', state: 'active', days_until_start: 0, days_until_due: 3, convocation_id: 'c1' } });
    sessionState.replace({ ...administratorSession, active_role: { id: 'role-2', code: 'coordinador', career_id: 'career-1', career_name: 'Software' } });
    const wrapper = await mountShell();
    await flushPromises();

    const banner = wrapper.get('[role="status"]');
    expect(banner.text()).toBe('Quedan 3 días para recibir y revisar los sílabos de su carreraHasta el 30 de octubre de 2026');
    expect(banner.element.compareDocumentPosition(wrapper.get('header').element) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(getDeadline).toHaveBeenCalledTimes(1);

    sessionState.replace(administratorSession);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Quedan 3 días');
    expect(getDeadline).toHaveBeenCalledTimes(1);
  });

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
    expect(sidebar.text()).not.toContain('Panel');
    expect(sidebar.get('[data-sidebar="header"] img').attributes('src')).toContain('logo-ueb-horizontal');
    expect(sidebar.get('a[href="/admin/convocatorias"]').attributes('data-active')).toBe('true');
    expect(sidebar.get('a[href="/admin/convocatorias"]').attributes('aria-current')).toBe('page');
    expect(sidebar.text()).not.toContain('Configuración');
    expect(sidebar.find('[aria-label="Rol y carrera activos"]').exists()).toBe(false);
    expect(sidebar.find('[aria-label="Menú de usuario"]').exists()).toBe(false);
    expect(wrapper.get('header [aria-label="Menú de usuario"]').text()).toContain('Ada Admin');
    expect(wrapper.text()).not.toContain('Mis sílabos');
    expect(wrapper.find('[aria-label="Asistente curricular"]').exists()).toBe(false);
    const notificationsButton = wrapper.get('[aria-label="Notificaciones sin leer"]');
    expect(notificationsButton.get('[data-slot="badge"]').text()).toBe('');
  });

  it('no muestra Panel a Coordinación: entra a Revisión', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-coordinador', code: 'coordinador', career_id: 'career-1', career_name: 'Software' },
    });
    const wrapper = await mountShell();
    await flushPromises();

    const sidebar = wrapper.find('[data-sidebar="sidebar"]');
    expect(sidebar.findAll('[data-sidebar="content"] a').map((link) => link.text())).toEqual(['Revisión', 'Materias y asignaciones', 'Docentes', 'Proyecto de carrera', 'Malla']);
    expect(sidebar.text()).not.toContain('Antes de empezar');
    expect(sidebar.text()).not.toContain('Fuentes académicas');
    expect(sidebar.find('a[href="/coordinacion/fuentes"]').exists()).toBe(false);
    expect(sidebar.find('a[href="/coordinacion/proyecto-carrera"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Asistente curricular"]').exists()).toBe(false);
  });

  it('a Biblioteca no le muestra menú lateral y pone el logo en el encabezado', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-bibliotecario', code: 'bibliotecario', career_id: null, career_name: null },
    });
    const wrapper = await mountShell();
    await flushPromises();

    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(false);
    expect(wrapper.find('[data-sidebar="trigger"]').exists()).toBe(false);
    expect(wrapper.get('header a[aria-label="Ir al inicio"]').attributes('href')).toBe('/biblioteca/revisiones');
    expect(wrapper.get('header [aria-label="Menú de usuario"]').text()).not.toContain('Bibliotecario');
  });

  it('sin menú lateral ofrece instalar la aplicación desde el menú de usuario en móvil', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-docente', code: 'docente', career_id: 'career-1', career_name: 'Software' },
    });
    const wrapper = await mountShell();
    await wrapper.get('header [aria-label="Menú de usuario"]').trigger('click');
    await flushPromises();

    expect(document.body.querySelector('[data-test="install-app"]')?.textContent?.trim()).toBe('Instalar aplicación');
  });

  it('al docente no le muestra menú lateral y le deja cambiar de rol desde el menú de usuario', async () => {
    sessionState.replace({
      ...administratorSession,
      active_role: { id: 'role-docente', code: 'docente', career_id: 'career-1', career_name: 'Software' },
    });
    const wrapper = await mountShell();
    await flushPromises();

    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(false);
    expect(wrapper.get('header a[aria-label="Ir al inicio"]').attributes('href')).toBe('/docente/mis-silabos');
    expect(wrapper.find('header [role="progressbar"]').exists()).toBe(false);

    await wrapper.get('header [aria-label="Menú de usuario"]').trigger('click');
    await flushPromises();
    leaveActiveRole.mockResolvedValue({ ...administratorSession, active_role: null });
    document.body.querySelector<HTMLElement>('[data-test="switch-scope"]')!.click();
    await flushPromises();

    expect(leaveActiveRole).toHaveBeenCalled();
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/rol');
    expect(sessionState.current.value?.active_role).toBeNull();
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

  it('expone el cambio de ámbito desde el menú de usuario y no desde el menú lateral', async () => {
    const wrapper = await mountShell();
    const accountButton = wrapper.get('header [aria-label="Menú de usuario"]');
    await accountButton.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Cerrar sesión');

    const logoutItem = document.body.querySelector<HTMLElement>('[data-test="logout-button"]');
    expect(logoutItem?.classList.contains('block')).toBe(false);
    expect(logoutItem?.classList.contains('flex')).toBe(true);
    expect(wrapper.find('[data-sidebar="sidebar"] [data-test="switch-scope"]').exists()).toBe(false);

    leaveActiveRole.mockResolvedValue({ ...administratorSession, active_role: null });
    document.body.querySelector<HTMLElement>('[data-test="switch-scope"]')!.click();
    await flushPromises();

    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/rol');
  });

  it('no presenta Administración cuando todavía no hay un rol activo', async () => {
    sessionState.replace({ ...administratorSession, active_role: null });
    const wrapper = await mountShell();
    await flushPromises();

    await wrapper.get('header [aria-label="Menú de usuario"]').trigger('click');
    await flushPromises();
    expect(document.body.querySelector('[data-test="switch-scope"]')).toBeNull();

    const accountButton = wrapper.get('header [aria-label="Menú de usuario"]');
    expect(accountButton.text()).not.toContain('Administrador');
  });
});
