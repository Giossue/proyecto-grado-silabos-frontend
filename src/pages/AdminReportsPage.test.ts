import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadProcessReport, getProcessReport, type ReportPayload } from '@/api/reports';
import AdminReportsPage from '@/pages/AdminReportsPage.vue';

const replace = vi.fn();
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace }) }));
vi.mock('@/api/reports', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/reports')>()), getProcessReport: vi.fn(), downloadProcessReport: vi.fn() }));
// Las gráficas dibujan SVG con medidas reales: aquí solo importa que la pantalla las arme.
vi.mock('@unovis/vue/containers/xy-container', () => ({ default: { name: 'VisXYContainer', props: ['data'], template: '<div data-chart><slot /></div>' } }));
vi.mock('@unovis/vue/components/axis', () => ({ default: { props: ['type', 'tickValues'], template: '<i :data-axis="type" :data-ticks="tickValues?.join(\',\')" />' } }));
vi.mock('@unovis/vue/components/grouped-bar', () => ({ default: { template: '<i />' } }));
vi.mock('@unovis/vue/components/line', () => ({ default: { template: '<i />' } }));
vi.mock('@unovis/vue/components/stacked-bar', () => ({ default: { template: '<i />' } }));
vi.mock('@unovis/ts/types/curve', () => ({ CurveType: { MonotoneX: 'monotoneX' } }));
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: { template: '<div><slot /></div>' }, ChartLegendContent: { template: '<i />' }, ChartTooltip: { template: '<i />' },
  ChartCrosshair: { template: '<i />' }, ChartTooltipContent: {}, componentToString: () => () => '',
}));

const states = (a: number, b: number, c: number, d: number, e: number) => ({ sin_iniciar: a, borrador: b, en_revision: c, correccion_solicitada: d, aprobado: e });
const payload: ReportPayload = {
  options: [{ value: 'p1', label: 'Octubre-Febrero 2026-2027' }],
  report: {
    process: { id: 'p1', period: 'Octubre-Febrero 2026-2027', starts_at: '2026-10-01', due_at: '2026-12-31', state: 'abierto' },
    kpis: { total: 12, approved_percent: 50, on_time_percent: null, review_days: 2.5 },
    careers: [{ career: 'Software', total: 12, states: states(1, 2, 2, 1, 6), returns: { coordinacion: 2, biblioteca: 1 }, late: 1, approved: 6, pending: 6, returned: 1, progress: 50 }],
    daily: [],
    pending: [{ teachers: 'ANA PÉREZ', career: 'Software', subject: 'Programación Básica', parallel: 'A', state: 'borrador', late: true }],
  },
};
const stubs = {};

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.mocked(getProcessReport).mockResolvedValue(payload);
  });

  it('muestra las cifras, las gráficas y las tablas por carrera y de pendientes', async () => {
    const wrapper = mount(AdminReportsPage, { global: { stubs } });
    await flushPromises();

    expect(getProcessReport).toHaveBeenCalledWith(null);
    expect(wrapper.text()).toContain('Aprobados');
    expect(wrapper.text()).toContain('Todavía no hay envíos');
    expect(wrapper.text()).toContain('Avance por carrera');
    expect(wrapper.text()).toContain('Devoluciones');
    expect(wrapper.findAll('[data-chart]')).toHaveLength(2);
    const table = wrapper.get('table[aria-label="Avance por carrera"]').text();
    expect(table).toContain('Software');
    expect(table).toContain('50 %');
    expect(wrapper.get('table[aria-label="Sílabos pendientes por docente"]').text()).toContain('ANA PÉREZ');
    expect(wrapper.text()).toContain('(atrasado)');
  });

  it('marca solo números enteros en el eje vertical de las gráficas', async () => {
    const wrapper = mount(AdminReportsPage, { global: { stubs } });
    await flushPromises();

    const ticks = wrapper.findAll('[data-axis="y"]').map((axis) => axis.attributes('data-ticks'));
    // 12 sílabos en la carrera y como máximo 2 devoluciones: nada de 1,2 o 1,4.
    expect(ticks).toEqual(['0,3,6,9,12', '0,1,2']);
  });

  it('exporta a Excel la convocatoria elegida', async () => {
    vi.mocked(downloadProcessReport).mockResolvedValue();
    const wrapper = mount(AdminReportsPage, { global: { stubs } });
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Exportar a Excel')!.trigger('click');
    await flushPromises();
    expect(downloadProcessReport).toHaveBeenCalledWith('p1', 'reporte-octubre-febrero-2026-2027.xlsx');
  });

  it('sin convocatorias lo dice en una card de vacío', async () => {
    vi.mocked(getProcessReport).mockResolvedValue({ options: [], report: null });
    const wrapper = mount(AdminReportsPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Todavía no hay convocatorias');
  });
});
