import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLibraryReviews, type LibraryReviewsPage } from '@/api/library';
import LibraryReviewsPageView from '@/pages/LibraryReviewsPage.vue';

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: { state: 'pendiente' }, fullPath: '/biblioteca/revisiones?state=pendiente' }),
  useRouter: () => ({ replace, push }),
}));
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
    expect(wrapper.text()).toContain('Revisiones de biblioteca - ');
    expect(row.text()).not.toContain('N.º');
    expect(row.text()).toContain('Con comentario');
    wrapper.unmount();
  });
});
