import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoordinationReviewsPage from '@/pages/CoordinationReviewsPage.vue';
import { getConvocation } from '@/api/convocations';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getReviews, type ReviewsPage } from '@/api/reviews';
import { getSession } from '@/api/session';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));
vi.mock('@/api/reviews', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/reviews')>()), getReviews: vi.fn() }));
vi.mock('@/api/convocations', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/convocations')>()), getConvocation: vi.fn() }));

const reviews: ReviewsPage = {
  filters: { state: '', search: '' },
  syllabi: {
    data: [{ id: 's1', revision_id: 'r1', revision_number: 1, subject: 'Álgebra Lineal', code: 'SW-B1-002', period: '2026-2027', state: 'en_revision', stage: 'coordinacion', teachers: ['Domenica Arias'], submitted_at: '2026-10-27T10:00:00Z' }],
    current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1,
  },
};

const summary = (convocationId: string | null): Dashboard => ({
  metrics: [
    { key: 'progress', label: 'Avance del proceso', value: 0, suffix: '%', hint: '0 de 2 sílabos aprobados' },
    { key: 'in_review', label: 'Por revisar', value: 1, suffix: null, hint: 'Enviados por los docentes y a la espera de su revisión' },
    { key: 'not_started', label: 'Sílabos sin iniciar', value: 1, suffix: null, hint: 'Docentes que todavía no empiezan' },
  ],
  setup: null,
  deadline: { period: '2026-2027', starts_at: '2026-10-26', due_at: '2026-10-30', state: 'active', days_until_start: 0, days_until_due: 3, convocation_id: convocationId },
  coordination_convocation: { process_id: 'p1', period: '2026-2027', convocation_id: convocationId, can_open: convocationId === null, state: convocationId ? 'abierta' : null, process_open: true },
});

const mountPage = () => mount(CoordinationReviewsPage, {
  attachTo: document.body,
  global: { stubs: { PageFrame: { template: '<div><slot name="banner" /><div class="actions"><slot name="actions" /></div><slot /></div>' }, ConvocationOpeningDialog: true } },
});

describe('CoordinationReviewsPage', () => {
  beforeEach(() => {
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

  it('reúne arriba el plazo, los indicadores, Pausar y Puesta en marcha', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('Quedan 3 días para recibir y revisar los sílabos de su carreraHasta el 30 de octubre de 2026.');
    expect(wrapper.text()).toContain('Por revisar');
    expect(wrapper.text()).toContain('Sílabos sin iniciar');
    expect(wrapper.get('.actions').text()).toContain('Pausar convocatoria');
    expect(wrapper.get('.actions a').attributes('href')).toBe('/coordinacion/puesta-en-marcha');
    expect(wrapper.text()).toContain('Álgebra Lineal');
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
});
