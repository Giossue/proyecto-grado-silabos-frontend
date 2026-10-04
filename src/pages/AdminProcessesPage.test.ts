import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminProcessesPage from './AdminProcessesPage.vue';

const api = vi.hoisted(() => ({ getAcademicGovernance: vi.fn(), getProcesses: vi.fn(), getSession: vi.fn() }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), getAcademicGovernance: api.getAcademicGovernance }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), getProcesses: api.getProcesses }));
vi.mock('@/api/session', () => ({ getSession: api.getSession }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/state/session', () => ({ sessionState: { current: { value: { active_role: { code: 'administrador' } } } } }));

const period = (id: string, code: string, process: { id: string; state: 'abierto' | 'pausado' | 'cerrado' } | null, lockReason: string | null = null) => ({
  id, code, starts_on: '2026-09-29', ends_on: '2027-03-01', teaching_weeks: 23, status: 'en_curso', status_label: 'En curso', institutional_process: process, lock_reason: lockReason,
});
const mountPage = () => mount(AdminProcessesPage, { attachTo: document.body, global: { stubs: {
  PageFrame: { props: ['title'], template: '<main><h1>{{ title }}</h1><slot name="actions" /><slot /></main>' },
  ConvocationPeriodSheet: true, ConvocationRowActions: true, RouterLink: { template: '<a><slot /></a>' },
} } });

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

describe('AdminProcessesPage', () => {
  it('muestra una fila por periodo, con o sin convocatoria', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [
      period('p1', 'Septiembre-Marzo 2026-2027', { id: 'pr1', state: 'abierto' }), period('p2', 'Abril-Agosto 2027', null),
    ] }, options: {} });
    api.getProcesses.mockResolvedValue({ processes: [{ id: 'pr1', name: 'Convocatoria', state: 'abierto', template: 'x', period_id: 'p1', period_name: 'Septiembre-Marzo 2026-2027', starts_at: '2026-10-01', due_at: '2026-10-20', convocations_count: 0, configurable: true, deletable: true }], template: null, periods: [], active_process: null });
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Abierto');
    expect(rows[1].text()).toContain('Sin iniciar');
    expect(rows[1].text()).toContain('Sin fechas');
    // Con un proceso abierto no se puede abrir otra convocatoria.
    expect(wrapper.text()).toContain('Convocatoria en curso');
    expect(wrapper.find('convocation-period-sheet-stub').attributes('disabled')).toBe('true');
    wrapper.unmount();
  });

  it('con todo finalizado permite abrir una nueva convocatoria', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [period('p1', 'Septiembre-Marzo 2026-2027', { id: 'pr1', state: 'cerrado' })] }, options: {} });
    api.getProcesses.mockResolvedValue({ processes: [{ id: 'pr1', name: 'Convocatoria', state: 'cerrado', template: 'x', period_id: 'p1', period_name: 'Septiembre-Marzo 2026-2027', starts_at: '2026-10-01', due_at: '2026-10-20', convocations_count: 0, configurable: true, deletable: true }], template: null, periods: [], active_process: null });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Finalizado');
    expect(wrapper.text()).not.toContain('Convocatoria en curso');
    expect(wrapper.find('convocation-period-sheet-stub').attributes('disabled')).toBe('false');
    wrapper.unmount();
  });
});
