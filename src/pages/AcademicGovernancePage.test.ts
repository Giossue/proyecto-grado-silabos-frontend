import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AcademicGovernancePage from './AcademicGovernancePage.vue';

const api = vi.hoisted(() => ({ getAcademicGovernance: vi.fn(), getSession: vi.fn(), replace: vi.fn(), route: { params: {} as Record<string, string>, query: {} as Record<string, string> } }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), getAcademicGovernance: api.getAcademicGovernance }));
vi.mock('@/api/session', () => ({ getSession: api.getSession }));
vi.mock('vue-router', () => ({ useRoute: () => api.route, useRouter: () => ({ replace: api.replace }) }));
vi.mock('@/state/session', () => ({ sessionState: { current: { value: { active_role: { code: 'administrador' } } } } }));

const mountPage = () => mount(AcademicGovernancePage, { attachTo: document.body, global: { stubs: {
  PageFrame: { props: ['title'], template: '<main><slot name="banner" /><h1>{{ title }}</h1><slot name="actions" /><slot /></main>' },
  CatalogRecordSheet: true, CatalogSection: true, RouterLink: { template: '<a><slot /></a>' },
} } });

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

describe('AcademicGovernancePage', () => {
  it('la ruta antigua de Periodos redirige a Convocatorias', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.route.params = { section: 'periodos-academicos' };
    const wrapper = mountPage();
    await flushPromises();

    expect(api.replace).toHaveBeenCalledWith('/admin/convocatorias');
    expect(api.getAcademicGovernance).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('sin sección muestra Facultades', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.route.params = {};
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [] }, options: {} });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('Facultades');
    wrapper.unmount();
  });

  it('mientras carga muestra las pestañas como skeleton', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.route.params = {};
    let resolve: (value: unknown) => void = () => {};
    api.getAcademicGovernance.mockReturnValue(new Promise((done) => { resolve = done; }));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="table-tabs"]').exists()).toBe(true);

    resolve({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [] }, options: {} });
    await flushPromises();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="table-tabs"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('el aviso distingue una convocatoria abierta de una finalizada y sin ninguna no sale', async () => {
    const base = { lock_reason: 'Convocatoria cerrada', catalogs: { faculties: [], careers: [], periods: [] }, options: {} };
    api.getAcademicGovernance.mockResolvedValue({ ...base, convocation_notice: 'finalized' });
    const finalized = mountPage();
    await flushPromises();
    expect(finalized.text()).toContain('La convocatoria finalizó');
    expect(finalized.text()).not.toContain('Hay una convocatoria abierta');
    finalized.unmount();

    api.getAcademicGovernance.mockResolvedValue({ ...base, convocation_notice: 'open' });
    const open = mountPage();
    await flushPromises();
    expect(open.text()).toContain('Hay una convocatoria abierta');
    open.unmount();

    api.getAcademicGovernance.mockResolvedValue({ ...base, convocation_notice: null });
    const none = mountPage();
    await flushPromises();
    expect(none.text()).not.toContain('Hay una convocatoria abierta');
    expect(none.text()).not.toContain('La convocatoria finalizó');
    none.unmount();
  });
});
