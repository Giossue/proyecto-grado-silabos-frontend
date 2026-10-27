import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLibraryHistory, type LibraryHistoryPage } from '@/api/library';
import LibraryHistoryPageView from '@/pages/LibraryHistoryPage.vue';

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: { mine: '1' }, fullPath: '/biblioteca/historial?mine=1' }),
  useRouter: () => ({ replace, push }),
}));
vi.mock('@/api/library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/library')>()),
  getLibraryHistory: vi.fn(),
}));

const history = (): LibraryHistoryPage => ({
  filters: { state: null, q: null, faculty: null },
  faculties: [{ id: 'f1', name: 'Ciencias Administrativas' }],
  periods: [{ id: 'p1', code: '2025-2026' }],
  reviews: {
    data: [{
      revision_id: 'revision-1', syllabus_id: 'syllabus-1', subject: 'Álgebra Lineal', code: 'SW-B1-002', career: 'Software', period: '2025-2026',
      parallels: ['A'], teachers: ['Domenica Arias'], revision_number: 1, sent_at: '2025-11-02T10:00:00-05:00', sent_by: 'Domenica Arias', state: 'firmado',
    }],
    current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1,
  },
});

describe('LibraryHistoryPage', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(getLibraryHistory).mockReset().mockResolvedValue(history());
  });

  it('lista los períodos terminados y respeta «Solo los míos» de la URL', async () => {
    const wrapper = mount(LibraryHistoryPageView, { attachTo: document.body });
    await flushPromises();

    expect(getLibraryHistory).toHaveBeenCalledWith({ q: '', state: 'all', faculty: 'all', period: 'all', mine: true, page: 1 });
    expect(replace).toHaveBeenCalledWith({ query: { mine: '1' } });
    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual(['Período', 'Carrera', 'Docente', 'Estado']);
    const row = wrapper.get('tbody tr');
    expect(row.text()).toContain('2025-2026');
    expect(row.text()).toContain('Firmado');
    await row.trigger('click');
    expect(push).toHaveBeenCalledWith('/biblioteca/revisiones/revision-1');
    wrapper.unmount();
  });

  it('explica cuando el bibliotecario no revisó nada con esos filtros', async () => {
    vi.mocked(getLibraryHistory).mockResolvedValue({ ...history(), reviews: { ...history().reviews, data: [], total: 0, from: null, to: null } });
    const wrapper = mount(LibraryHistoryPageView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('No hay sílabos revisados por usted con estos filtros');
    wrapper.unmount();
  });
});
