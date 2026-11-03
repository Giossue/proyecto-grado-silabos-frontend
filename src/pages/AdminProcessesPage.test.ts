import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminProcessesPage from './AdminProcessesPage.vue';

const api = vi.hoisted(() => ({ getAcademicGovernance: vi.fn(), getProcesses: vi.fn(), getSession: vi.fn(), getDashboard: vi.fn() }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), getAcademicGovernance: api.getAcademicGovernance }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), getProcesses: api.getProcesses }));
vi.mock('@/api/session', () => ({ getSession: api.getSession }));
vi.mock('@/api/dashboard', () => ({ getDashboard: api.getDashboard }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }), RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }));
vi.mock('@/state/session', () => ({ sessionState: { current: { value: { active_role: { code: 'administrador' } } } } }));

const period = (id: string, code: string, process: { id: string; state: 'abierto' | 'pausado' | 'cerrado' } | null, lockReason: string | null = null) => ({
  id, code, starts_on: '2026-09-29', ends_on: '2027-03-01', teaching_weeks: 23, status: 'en_curso', status_label: 'En curso', institutional_process: process, lock_reason: lockReason,
});
const WithTooltips = defineComponent({ setup: () => () => h(TooltipProvider, () => h(AdminProcessesPage)) });
const mountPage = () => mount(WithTooltips, { attachTo: document.body, global: { stubs: {
  PageFrame: { props: ['title'], template: '<main><slot name="banner" /><h1>{{ title }}</h1><slot name="actions" /><slot /></main>' },
  ConvocationPeriodSheet: true, ConvocationRowActions: true,
} } });

beforeEach(() => { api.getDashboard.mockResolvedValue({ metrics: [], setup: null, deadline: null, coordination_convocation: null }); });
afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

describe('AdminProcessesPage', () => {
  it('muestra una fila por periodo, con o sin convocatoria', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [
      period('p1', 'Septiembre-Marzo 2026-2027', { id: 'pr1', state: 'abierto' }), period('p2', 'Abril-Agosto 2027', null),
    ] }, options: {} });
    api.getProcesses.mockResolvedValue({ processes: [{ id: 'pr1', name: 'Convocatoria', state: 'abierto', template: 'x', period_id: 'p1', period_name: 'Septiembre-Marzo 2026-2027', starts_at: '2026-10-01', due_at: '2026-10-20', convocations_count: 0, configurable: true, deletable: true, extensions_used: 0, extensions_max: 2, extension_limit_on: '2027-03-31', extension_block_reason: null }], template: null, periods: [], active_process: null });
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Abierto');
    expect(rows[1].text()).toContain('Sin iniciar');
    expect(rows[1].text()).toContain('Sin fechas');
    expect(wrapper.text()).toContain('Convocatoria en curso');
    expect(wrapper.find('convocation-period-sheet-stub').attributes('disabled')).toBe('true');
    wrapper.unmount();
  });

  it('muestra arriba los indicadores y deja «Nueva convocatoria» deshabilitada', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [] }, options: {} });
    api.getProcesses.mockResolvedValue({ processes: [], template: null, periods: [], active_process: null });
    const step = (key: string, done: boolean) => ({ key, label: `Paso ${key}`, hint: `Pista ${key}`, done, action: null });
    api.getDashboard.mockResolvedValue({
      metrics: [{ key: 'careers_without_convocation', label: 'Carreras sin convocar', value: 3, suffix: null, hint: 'Pista' }],
      setup: { title: 'Antes de empezar', intro: '', done: 1, total: 6, steps: [step('faculties', true), step('careers', false), step('accounts', false), step('coordinators', false), step('template', false), step('process', false)] },
      deadline: null, coordination_convocation: null,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Carreras sin convocar');
    expect(wrapper.find('convocation-period-sheet-stub').attributes('disabled')).toBe('true');
  });

  it('con todo finalizado permite abrir una nueva convocatoria', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' } });
    api.getAcademicGovernance.mockResolvedValue({ lock_reason: null, catalogs: { faculties: [], careers: [], periods: [period('p1', 'Septiembre-Marzo 2026-2027', { id: 'pr1', state: 'cerrado' })] }, options: {} });
    api.getProcesses.mockResolvedValue({ processes: [{ id: 'pr1', name: 'Convocatoria', state: 'cerrado', template: 'x', period_id: 'p1', period_name: 'Septiembre-Marzo 2026-2027', starts_at: '2026-10-01', due_at: '2026-10-20', convocations_count: 0, configurable: true, deletable: true, extensions_used: 0, extensions_max: 2, extension_limit_on: '2027-03-31', extension_block_reason: null }], template: null, periods: [], active_process: null });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Cerrado');
    expect(wrapper.text()).not.toContain('Convocatoria en curso');
    expect(wrapper.find('convocation-period-sheet-stub').attributes('disabled')).toBe('false');
    wrapper.unmount();
  });
});
