import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import CoordinationReviewsPage from '@/pages/CoordinationReviewsPage.vue';
import { getConvocation } from '@/api/convocations';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getReviews, type ReviewsPage } from '@/api/reviews';
import { getSession } from '@/api/session';

const { query } = vi.hoisted(() => ({ query: {} as Record<string, string> }));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ query }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));
vi.mock('@/api/reviews', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/reviews')>()), getReviews: vi.fn() }));
vi.mock('@/api/convocations', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/convocations')>()), getConvocation: vi.fn() }));

const reviews: ReviewsPage = {
  filters: { search: '' },
  syllabi: {
    data: [{ id: 's1', revision_id: 'r1', revision_number: 1, subject: 'Álgebra Lineal', code: 'SW-B1-002', period: '2026-2027', state: 'en_revision', stage: 'coordinacion', teachers: ['Domenica Arias'], submitted_at: '2026-10-27T10:00:00Z' }],
    current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1,
  },
};

const summary = (convocationId: string | null): Dashboard => ({
  metrics: [],
  setup: { title: 'Antes de empezar', intro: '', done: 4, total: 5, steps: ['curriculum', 'scheduled_subjects', 'parallels', 'teachers', 'convocation'].map((key) => ({ key, label: key, hint: key === 'convocation' ? 'Complete la ficha de 2 materia(s) en Proyecto de carrera.' : '', done: key !== 'convocation', action: null })) },
  deadline: { period: '2026-2027', starts_at: '2026-10-26', due_at: '2026-10-30', state: 'active', days_until_start: 0, days_until_due: 3, convocation_id: convocationId , paused_by: null },
  coordination_convocation: { process_id: 'p1', period: '2026-2027', convocation_id: convocationId, can_open: convocationId === null, state: convocationId ? 'abierta' : null, process_open: true },
});

const WithTooltips = defineComponent({ setup: () => () => h(TooltipProvider, () => h(CoordinationReviewsPage)) });
const mountPage = () => mount(WithTooltips, {
  attachTo: document.body,
  global: { stubs: { PageFrame: { template: '<div><slot name="banner" /><div class="actions"><slot name="actions" /></div><slot /></div>' }, ConvocationOpeningDialog: true } },
});

describe('CoordinationReviewsPage', () => {
  beforeEach(() => {
    for (const key of Object.keys(query)) delete query[key];
    vi.mocked(getSession).mockResolvedValue({ active_role: { code: 'coordinador' } } as Awaited<ReturnType<typeof getSession>>);
    vi.mocked(getReviews).mockResolvedValue(reviews);
    vi.mocked(getDashboard).mockResolvedValue(summary('c1'));
    vi.mocked(getConvocation).mockResolvedValue({
      convocation: {
        id: 'c1', name: 'Software', state: 'abierta', process: { name: 'P', state: 'abierto' }, period: '2026-2027', template: 'Oficial', start_date: null, draft_deadline: null,
        counts: { total: 2, not_started: 1, draft: 0, in_review: 1, approved: 0 },
        syllabi: [{ id: 's2', subject: 'Programación Orientada a Objetos', code: 'SW-B2-006', state: 'sin_iniciar', iniciado_en: null, parallels: ['A'], teachers: ['Eduardo Narvaez'] }],
      },
    });
  });

  it('reúne arriba Pausar y las demás acciones, sin indicadores', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Avance del proceso');
    expect(wrapper.get('.actions').text()).toContain('Pausar convocatoria');
    expect(wrapper.text()).toContain('Álgebra Lineal');
    expect(wrapper.text()).toContain('27 oct 2026');
    expect(wrapper.text()).not.toContain('Por revisar');
    expect(wrapper.find('#review-state').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Todos los estados');
    wrapper.unmount();
  });

  it('abre en la pestaña que dice la dirección, para que «Volver» regrese a Seguimiento', async () => {
    query.tab = 'seguimiento';
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get('[role="tab"][data-state="active"]').text()).toContain('Seguimiento');
    wrapper.unmount();
  });

  it('sin todo listo, «Abrir convocatoria» queda deshabilitado y explica por qué', async () => {
    vi.mocked(getDashboard).mockResolvedValue({ ...summary(null), coordination_convocation: { ...summary(null).coordination_convocation!, can_open: false } });
    const wrapper = mountPage();
    await flushPromises();

    const open = wrapper.findAll('.actions button').find((button) => button.text().includes('Abrir convocatoria'))!;
    expect(open.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('muestra el seguimiento en una pestaña, no en un modal', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(getConvocation).not.toHaveBeenCalled();
    await wrapper.get('[role="tab"][aria-controls]:not([aria-selected="true"])').trigger('mousedown', { button: 0 });
    await flushPromises();

    expect(getConvocation).toHaveBeenCalledWith('c1');
    expect(wrapper.text()).toContain('Programación Orientada a Objetos');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    // Un contenedor con desplazamiento propio recortaría el borde y la sombra de la tabla.
    expect(wrapper.find('.overflow-x-auto > div > [data-slot="table-container"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('sin convocatoria ofrece abrirla y deja el seguimiento deshabilitado', async () => {
    vi.mocked(getDashboard).mockResolvedValue(summary(null));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get('.actions').text()).toContain('Abrir convocatoria');
    expect(wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'Seguimiento')!.attributes('data-disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('con convocatoria la pestaña Seguimiento recibe clics; sin ella el aviso se muestra sobre el envoltorio', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const seguimiento = () => wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'Seguimiento')!;

    expect(seguimiento().attributes('data-disabled')).toBeUndefined();
    expect(seguimiento().element.parentElement!.className).not.toContain('pointer-events');
    wrapper.unmount();

    vi.mocked(getDashboard).mockResolvedValue(summary(null));
    const closed = mountPage();
    await flushPromises();
    expect(closed.findAll('[role="tab"]').find((tab) => tab.text() === 'Seguimiento')!.element.parentElement!.className).toContain('[&_button]:pointer-events-none');
    closed.unmount();
  });

  it('muestra un ícono en cada pestaña', async () => {
    vi.mocked(getDashboard).mockResolvedValue(summary(null));
    const wrapper = mountPage();
    await flushPromises();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual(['Cola de revisión', 'Seguimiento']);
    expect(tabs.every((tab) => tab.find('svg').exists())).toBe(true);
    wrapper.unmount();
  });
});
