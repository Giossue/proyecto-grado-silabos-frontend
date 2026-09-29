import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AcademicGovernance } from '@/api/academic';
import AcademicGovernancePage from './AcademicGovernancePage.vue';

const api = vi.hoisted(() => ({ getAcademicGovernance: vi.fn(), getSession: vi.fn(), route: { params: { section: 'periodos-academicos' } as Record<string, string>, query: {} } }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), getAcademicGovernance: api.getAcademicGovernance }));
vi.mock('@/api/session', () => ({ getSession: api.getSession }));
vi.mock('vue-router', () => ({ useRoute: () => api.route, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/state/session', () => ({ sessionState: { current: { value: { active_role: { code: 'administrador' } } } } }));

const governance = (lockReason: string | null): AcademicGovernance => ({
  lock_reason: lockReason,
  catalogs: { faculties: [], careers: [], periods: [{
    id: 'period-1', code: 'Septiembre-Marzo 2026-2027', starts_on: '2026-09-29', ends_on: '2027-03-01', teaching_weeks: 23,
    status: 'en_curso', status_label: 'En curso', institutional_process: { id: 'process-1', state: 'abierto' }, lock_reason: lockReason,
  }] },
  options: { faculties: [], careers: [], periods: [], campusOptions: [], currentCurricula: [], activeSubjects: [], scheduledSubjects: [], parallels: [], coordinatorUsers: [], teacherUsers: [] },
} as unknown as AcademicGovernance);
const mountPage = () => mount(AcademicGovernancePage, { attachTo: document.body, global: { stubs: {
  PageFrame: { props: ['title'], template: '<main><h1>{{ title }}</h1><slot name="actions" /><slot /></main>' },
  CatalogRecordSheet: true, RouterLink: { template: '<a><slot /></a>' },
} } });

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

describe('AcademicGovernancePage', () => {
  it('en Períodos avisa que la edición está bloqueada cuando hay una convocatoria en curso', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue(governance('Convocatoria activa'));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Edición bloqueada');
    expect(wrapper.text()).toContain('Pause el proceso para editar');
    wrapper.unmount();
  });

  it('sin convocatoria en curso no muestra el aviso', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue(governance(null));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Edición bloqueada');
    wrapper.unmount();
  });
});
