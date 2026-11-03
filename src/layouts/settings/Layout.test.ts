import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import { settingsReturn, trackSettingsReturn } from '@/state/settingsReturn';

enableAutoUnmount(afterEach);

const Empty = { template: '<div />' };
const makeRouter = () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/coordinacion/revisiones', component: Empty },
      { path: '/coordinacion/proyecto-carrera', component: Empty },
      { path: paths.coordination.profile, component: SettingsLayout },
      { path: paths.coordination.security, component: SettingsLayout },
      { path: paths.dashboard, component: Empty },
      { path: paths.admin.security, component: SettingsLayout },
      { path: paths.admin.system, component: SettingsLayout },
      { path: paths.coordination.emailNotices, component: SettingsLayout },
    ],
  });
  router.afterEach(trackSettingsReturn);

  return router;
};
const mountAt = async (router: ReturnType<typeof makeRouter>) => {
  await router.isReady();
  return mount(SettingsLayout, { global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });
};
const volver = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').find((button) => button.text() === 'Volver')!;

describe('Configuración: Volver', () => {
  beforeEach(() => {
    settingsReturn.value = null;
    sessionState.replace({
      user: { id: 'u1', name: 'Ana', email: 'ana@ueb.edu.ec', email_verified: true, can_edit_identity: false },
      active_role: { id: 'r1', code: 'coordinador', career_id: 'c1', career_name: 'Software' },
      available_roles: [],
    });
  });
  afterEach(() => sessionState.clear());

  it('lleva a donde estaba antes de entrar, aunque se haya cambiado entre Perfil y Seguridad', async () => {
    const router = makeRouter();
    await router.push('/coordinacion/proyecto-carrera');
    await router.push(paths.coordination.profile);
    await router.push(paths.coordination.security);
    const wrapper = await mountAt(router);

    await volver(wrapper).trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/coordinacion/proyecto-carrera');
  });

  it('si se abrió Configuración directo, lleva al inicio del rol', async () => {
    const router = makeRouter();
    await router.push(paths.coordination.security);
    const wrapper = await mountAt(router);

    await volver(wrapper).trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe(paths.coordination.reviews);
  });

  it('solo Administración tiene la pestaña «Sistema»', async () => {
    const router = makeRouter();
    await router.push(paths.coordination.security);
    const coordinator = await mountAt(router);
    expect(coordinator.find('nav[aria-label="Configuración"]').text()).not.toContain('Sistema');

    await router.push(paths.admin.security);
    const admin = await mountAt(router);
    const tab = admin.findAll('nav[aria-label="Configuración"] a').find((link) => link.text() === 'Sistema');
    expect(tab?.attributes('href')).toBe('/admin/configuracion/sistema');
  });

  it('Coordinación, Docente y Biblioteca tienen la pestaña «Notificaciones»; Administración no', async () => {
    const router = makeRouter();
    await router.push(paths.coordination.security);
    const coordinator = await mountAt(router);
    const tab = coordinator.findAll('nav[aria-label="Configuración"] a').find((link) => link.text() === 'Notificaciones');
    expect(tab?.attributes('href')).toBe('/coordinacion/configuracion/notificaciones');

    await router.push(paths.admin.security);
    const admin = await mountAt(router);
    expect(admin.find('nav[aria-label="Configuración"]').text()).not.toContain('Notificaciones');
  });
});

describe('Configuración: carga', () => {
  beforeEach(() => {
    sessionState.replace({
      user: { id: 'u1', name: 'Ana', email: 'ana@ueb.edu.ec', email_verified: true, can_edit_identity: false },
      active_role: { id: 'r1', code: 'coordinador', career_id: 'c1', career_name: 'Software' },
      available_roles: [],
    });
  });
  afterEach(() => sessionState.clear());

  it('mientras carga, el ícono, el título y el subtítulo también son esqueleto', async () => {
    const router = makeRouter();
    await router.push(paths.coordination.security);
    await router.isReady();
    const wrapper = mount(SettingsLayout, { props: { loading: true }, global: { plugins: [router] }, slots: { default: '<p>Contenido</p>' } });

    expect(wrapper.find('[data-skeleton="page-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="page-title"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="page-description"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Administre su perfil');

    await wrapper.setProps({ loading: false });
    expect(wrapper.find('[data-skeleton="page-title"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Administre su perfil y seguridad');
  });
});
