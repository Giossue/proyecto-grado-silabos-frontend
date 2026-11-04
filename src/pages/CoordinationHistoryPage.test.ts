import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCoordinationHistory, type CoordinationHistoryPage } from '@/api/reviews';
import { openRevisionPdf } from '@/lib/openPdf';
import CoordinationHistoryPageView from '@/pages/CoordinationHistoryPage.vue';

const { replace, push, query } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), query: { value: {} as Record<string, string> } }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: query.value, fullPath: '/coordinacion/historial' }),
  useRouter: () => ({ replace, push }),
}));
vi.mock('@/api/reviews', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/reviews')>()),
  getCoordinationHistory: vi.fn(),
}));
vi.mock('@/lib/openPdf', () => ({ openRevisionPdf: vi.fn() }));

const item = (overrides: Partial<CoordinationHistoryPage['syllabi']['data'][number]>): CoordinationHistoryPage['syllabi']['data'][number] => ({
  id: 'syllabus-1', revision_id: 'revision-1', period: '2025-2026', subject: 'Arquitectura de Software', code: 'SW-601',
  parallels: ['A'], author: 'Docente Anterior', approved_at: '2026-02-10T15:00:00+00:00', ...overrides,
});

const history = (): CoordinationHistoryPage => ({
  filters: { q: null, period: null },
  periods: [{ id: 'p2', code: '2025-2026' }, { id: 'p1', code: '2024-2025' }],
  syllabi: {
    data: [
      item({}),
      item({ id: 'syllabus-2', revision_id: 'revision-2', subject: 'Bases de Datos', code: 'SW-602', parallels: ['B'] }),
      item({ id: 'syllabus-3', revision_id: 'revision-3', period: '2024-2025', subject: 'Redes', code: 'SW-701' }),
    ],
    current_page: 1, last_page: 1, per_page: 20, from: 1, to: 3, total: 3,
  },
});

describe('CoordinationHistoryPage', () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    query.value = {};
    vi.mocked(openRevisionPdf).mockReset().mockResolvedValue(null);
    vi.mocked(getCoordinationHistory).mockReset().mockResolvedValue(history());
  });

  it('agrupa los aprobados por período, del más reciente al más antiguo, con su autor', async () => {
    const wrapper = mount(CoordinationHistoryPageView, { attachTo: document.body });
    await flushPromises();

    expect(getCoordinationHistory).toHaveBeenCalledWith({ q: '', period: 'all', page: 1 });
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual(['Período 2025-2026', 'Período 2024-2025']);
    const tables = wrapper.findAll('table');
    expect(tables).toHaveLength(2);
    expect(tables[0]!.findAll('thead th').map((header) => header.text())).toEqual(['Asignatura', 'Código', 'Paralelos', 'Elaborado por', 'Aprobado', 'PDF']);
    expect(tables[0]!.findAll('tbody tr')).toHaveLength(2);
    const first = tables[0]!.get('tbody tr');
    expect(first.text()).toContain('Arquitectura de Software');
    expect(first.text()).toContain('SW-601');
    expect(first.text()).toContain('Docente Anterior');
    expect(tables[1]!.text()).toContain('Redes');

    await first.trigger('click');
    expect(push).toHaveBeenCalledWith('/coordinacion/revisiones/revision-1');
    wrapper.unmount();
  });

  it('«Ver PDF» abre el PDF de esa revisión sin abrir la fila', async () => {
    const wrapper = mount(CoordinationHistoryPageView, { attachTo: document.body });
    await flushPromises();

    const buttons = wrapper.findAll('button[aria-label="Ver PDF de Bases de Datos"]');
    expect(buttons).toHaveLength(1);
    await buttons[0]!.trigger('click');
    await flushPromises();
    expect(openRevisionPdf).toHaveBeenCalledWith('revision-2');
    expect(push).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('busca y filtra por período desde la URL', async () => {
    query.value = { q: 'bases', period: 'p1' };
    const wrapper = mount(CoordinationHistoryPageView, { attachTo: document.body });
    await flushPromises();

    expect(getCoordinationHistory).toHaveBeenCalledWith({ q: 'bases', period: 'p1', page: 1 });
    expect(replace).toHaveBeenCalledWith({ query: { q: 'bases', period: 'p1' } });

    await wrapper.get('input[type="search"]').setValue('redes');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(getCoordinationHistory).toHaveBeenLastCalledWith({ q: 'redes', period: 'p1', page: 1 });
    wrapper.unmount();
  });

  it('explica cuando no hay sílabos aprobados de períodos anteriores', async () => {
    vi.mocked(getCoordinationHistory).mockResolvedValue({ ...history(), syllabi: { ...history().syllabi, data: [], total: 0, from: null, to: null } });
    const wrapper = mount(CoordinationHistoryPageView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('No hay sílabos aprobados de períodos anteriores con estos filtros');
    wrapper.unmount();
  });
});
