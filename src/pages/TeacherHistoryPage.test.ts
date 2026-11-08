import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherHistoryPage from '@/pages/TeacherHistoryPage.vue';

const push = vi.fn();
const getTeacherHistory = vi.fn();

vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/api/syllabi', () => ({ getTeacherHistory: () => getTeacherHistory() }));

const mountPage = () => mount(TeacherHistoryPage, {
  global: { stubs: { PageFrame: { template: '<div><slot /></div>' } } },
});

describe('TeacherHistoryPage', () => {
  beforeEach(() => { push.mockReset(); getTeacherHistory.mockReset(); });

  it('lista las carreras con historial y abre la de la fila', async () => {
    getTeacherHistory.mockResolvedValue({ careers: [{ id: 'c1', name: 'Software', syllabi_count: 3 }] });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Software');
    await wrapper.get('tbody tr').trigger('click');
    expect(push).toHaveBeenCalledWith('/docente/historial/c1');
  });

  it('avisa cuando todavía no hay períodos anteriores', async () => {
    getTeacherHistory.mockResolvedValue({ careers: [] });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Todavía no tiene sílabos de períodos anteriores');
    expect(wrapper.text()).toContain('0–0 de 0');
  });
});
