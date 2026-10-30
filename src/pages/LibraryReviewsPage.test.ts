import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getDashboard } from '@/api/dashboard';
import { getLibraryReviews, type LibraryReviewsPage } from '@/api/library';
import LibraryReviewsPageView from '@/pages/LibraryReviewsPage.vue';

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: { state: 'pendiente' }, fullPath: '/biblioteca/revisiones?state=pendiente' }),
  useRouter: () => ({ replace, push }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));
vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));
vi.mock('@/api/library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/library')>()),
  getLibraryReviews: vi.fn(),
}));

const page = (): LibraryReviewsPage => ({
  filters: { state: 'pendiente', q: null },
  reviews: {
    data: [{
      revision_id: 'revision-2',
      syllabus_id: 'syllabus-1',
      subject: 'Arquitectura de Software',
      code: 'SW-601',
      career: 'Software',
      period: '2026-2027',
      parallels: ['A', 'B'],
      teachers: ['Docente Demo'],
      revision_number: 2,
      sent_at: '2026-09-28T10:00:00-05:00',
      sent_by: 'Docente Demo',
      state: 'atendido',
      outcome: 'devuelto',
    }],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    from: 1,
    to: 1,
    total: 1,
  },
});

describe('LibraryReviewsPage', () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    vi.mocked(getLibraryReviews).mockReset();
    vi.mocked(getDashboard).mockReset();
    vi.mocked(getDashboard).mockResolvedValue({
      metrics: [
        { key: 'library_pending', label: 'Por revisar', value: 2, suffix: null, hint: 'Aprobados por coordinación; falta la bibliografía' },
        { key: 'library_signed', label: 'Firmados', value: 3, suffix: null, hint: 'Bibliografía aprobada y firmada' },
        { key: 'library_commented', label: 'Devueltos', value: 1, suffix: null, hint: 'Con observaciones para el docente' },
      ],
      setup: null,
      deadline: { period: '2026-2027', starts_at: '2026-10-01', due_at: '2026-11-15', state: 'active', days_until_start: 0, days_until_due: 19, convocation_id: null },
      coordination_convocation: null,
    });
  });

  it('muestra arriba los tres indicadores de Biblioteca y no los vuelve a pedir al filtrar', async () => {
    vi.mocked(getLibraryReviews).mockResolvedValue(page());
    const wrapper = mount(LibraryReviewsPageView);
    await flushPromises();

    expect(wrapper.text()).toContain('Por revisar');
    expect(wrapper.text()).toContain('Firmados');
    expect(wrapper.text()).toContain('Devueltos');

    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(getDashboard).toHaveBeenCalledTimes(1);
    expect(getLibraryReviews).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('carga la bandeja con el filtro de la URL y nombra los estados de biblioteca', async () => {
    vi.mocked(getLibraryReviews).mockResolvedValue(page());
    const wrapper = mount(LibraryReviewsPageView, { attachTo: document.body });
    await flushPromises();

    expect(getLibraryReviews).toHaveBeenCalledWith({ q: '', state: 'pendiente', faculty: 'all', page: 1 });
    expect(replace).toHaveBeenCalledWith({ query: { state: 'pendiente' } });
    const row = wrapper.findAll('tbody tr')[0]!;
    const headers = wrapper.findAll('thead th').map((header) => header.text());
    expect(wrapper.get('#library-search').attributes('placeholder')).toBe('Buscar por asignatura, código, carrera o docente');
    expect(headers).toEqual(['Carrera', 'Docente', 'Estado']);
    expect(row.text()).not.toContain('SW-601');
    expect(row.text()).toContain('Software');
    expect(row.text()).not.toContain('A, B');
    expect(wrapper.text()).toContain('Período ');
    expect(row.text()).not.toContain('N.º');
    expect(row.text()).toContain('Atendido');
    wrapper.unmount();
  });

  it('recuerda la facultad que cada bibliotecario eligió y la usa al volver', async () => {
    vi.mocked(getLibraryReviews).mockResolvedValue({ ...page(), faculties: [{ id: 'f1', name: 'Ciencias Administrativas' }, { id: 'f2', name: 'Ciencias de la Salud' }] });
    localStorage.setItem('silabos:biblioteca:facultad:', 'f2');
    const wrapper = mount(LibraryReviewsPageView, { attachTo: document.body });
    await flushPromises();

    expect(getLibraryReviews).toHaveBeenCalledWith({ q: '', state: 'pendiente', faculty: 'f2', page: 1 });
    expect(replace).toHaveBeenCalledWith({ query: { state: 'pendiente', faculty: 'f2' } });
    expect(wrapper.text()).toContain('Ciencias de la Salud');
    localStorage.clear();
    wrapper.unmount();
  });

  it('si la facultad guardada ya no existe, vuelve a todas', async () => {
    localStorage.setItem('silabos:biblioteca:facultad:', 'retirada');
    vi.mocked(getLibraryReviews).mockRejectedValueOnce(new ApiError('La facultad seleccionada no es válida.', 422)).mockResolvedValue(page());
    const wrapper = mount(LibraryReviewsPageView, { attachTo: document.body });
    await flushPromises();

    expect(getLibraryReviews).toHaveBeenLastCalledWith({ q: '', state: 'pendiente', faculty: 'all', page: 1 });
    expect(localStorage.getItem('silabos:biblioteca:facultad:')).toBeNull();
    expect(wrapper.text()).not.toContain('no es válida');
    wrapper.unmount();
  });
});
