import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherSyllabiPage from '@/pages/TeacherSyllabiPage.vue';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));

vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));
vi.mock('@/api/syllabi', () => ({ getTeacherSyllabi: vi.fn() }));

const mountPage = () => mount(TeacherSyllabiPage, {
  global: { stubs: { PageFrame: { template: '<div><slot name="actions" /><slot /></div>' } } },
});

const syllabi: SyllabiResponse = {
  filters: { q: null, state: null },
  syllabi: {
    data: [{ id: 's1', subject: 'Álgebra Lineal', code: 'MAT-101', convocation: 'c1', period: '2026-2027', state: 'sin_iniciar', iniciado_en: null, parallels: ['A'], guardado_en: null }],
    current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1,
  },
};

const summary: Dashboard = {
  metrics: [
    { key: 'pending', label: 'Sílabos por entregar', value: 1, suffix: null, hint: 'Aún no enviados a revisión' },
    { key: 'correction_requested', label: 'Por corregir', value: 0, suffix: null, hint: 'Devueltos por Biblioteca o Coordinación' },
    { key: 'in_review', label: 'En revisión', value: 0, suffix: null, hint: 'Enviados y a la espera de revisión' },
  ],
  setup: null,
  deadline: { period: '2026-2027', starts_at: '2026-10-01', due_at: '2026-11-15', state: 'active', days_until_start: 0, days_until_due: 19, convocation_id: 'c1' },
  coordination_convocation: null,
};

describe('TeacherSyllabiPage', () => {
  beforeEach(() => {
    vi.mocked(getTeacherSyllabi).mockResolvedValue(syllabi);
    vi.mocked(getDashboard).mockResolvedValue(summary);
  });

  it('reúne los indicadores, el plazo y los sílabos en una sola pantalla', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Sílabos por entregar');
    expect(wrapper.text()).toContain('Por corregir');
    expect(wrapper.text()).toContain('Quedan 19 días para enviar sus sílabos a revisión: hasta el 15 de noviembre de 2026.');
    expect(wrapper.text()).not.toContain('Continuar mis sílabos');
    expect(wrapper.get('[aria-label="Mis sílabos"]').text()).toContain('Álgebra Lineal');
  });

  it('muestra los sílabos aunque el resumen no cargue y no lo vuelve a pedir al filtrar', async () => {
    vi.mocked(getDashboard).mockRejectedValueOnce(new Error('caído'));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Sílabos por entregar');
    expect(wrapper.get('[aria-label="Mis sílabos"]').text()).toContain('Álgebra Lineal');

    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(getDashboard).toHaveBeenCalledTimes(1);
    expect(getTeacherSyllabi).toHaveBeenCalledTimes(2);
  });
});
