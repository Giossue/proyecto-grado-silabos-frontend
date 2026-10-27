import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDashboard } from '@/api/dashboard';
import { getLibraryReviews, type LibraryReviewsPage } from '@/api/library';
import LibraryReviewsPageView from '@/pages/LibraryReviewsPage.vue';

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: { state: 'pendiente' }, fullPath: '/biblioteca/revisiones?state=pendiente' }),
  useRouter: () => ({ replace, push }),
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
      state: 'comentado',
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
        { key: 'library_pending', label: 'Por verificar', value: 2, suffix: null, hint: 'Aprobados por coordinación; falta la bibliografía' },
        { key: 'library_to_sign', label: 'Por firmar', value: 1, suffix: null, hint: 'Su firma va después de docente y coordinación' },
        { key: 'library_commented', label: 'Con comentario', value: 0, suffix: null, hint: 'Devueltos al docente desde biblioteca' },
        { key: 'library_signed', label: 'Firmados', value: 4, suffix: null, hint: 'Sílabos con la firma de biblioteca' },
      ],
      setup: null, deadline: null, coordination_convocation: null,
    });
  });

  it('muestra arriba los tres indicadores de Biblioteca y no los vuelve a pedir al filtrar', async () => {
    vi.mocked(getLibraryReviews).mockResolvedValue(page());
    const wrapper = mount(LibraryReviewsPageView);
    await flushPromises();

    expect(wrapper.text()).toContain('Por verificar');
    expect(wrapper.text()).toContain('Por firmar');
    expect(wrapper.text()).not.toContain('Firmados');

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

    expect(getLibraryReviews).toHaveBeenCalledWith({ q: '', state: 'pendiente', page: 1 });
    expect(replace).toHaveBeenCalledWith({ query: { state: 'pendiente' } });
    const row = wrapper.findAll('tbody tr')[0]!;
    const headers = wrapper.findAll('thead th').map((header) => header.text());
    expect(wrapper.get('#library-search').attributes('placeholder')).toBe('Buscar por asignatura o código');
    expect(headers).toEqual(['Carrera', 'Docente', 'Estado']);
    expect(row.text()).not.toContain('SW-601');
    expect(row.text()).toContain('Software');
    expect(row.text()).not.toContain('A, B');
    expect(wrapper.text()).toContain('Período ');
    expect(row.text()).not.toContain('N.º');
    expect(row.text()).toContain('Con comentario');
    wrapper.unmount();
  });
});
