import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurriculum, getScheduledSubjects, getTeacherAssignments, type Curriculum } from '@/api/career-academics';
import { getSession } from '@/api/session';
import CoordinationAcademicStructurePage from '@/pages/CoordinationAcademicStructurePage.vue';

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/career-academics', () => ({
  getCurriculum: vi.fn(),
  getScheduledSubjects: vi.fn(),
  getTeacherAssignments: vi.fn(),
}));

const curriculum = (editable = true): Curriculum => ({
  career: { id: 'career-1', name: 'Software', modality: null },
  curriculum: { id: 'career-1', cycle_count: 8, editable, lock_reason: editable ? null : 'Convocatoria activa' },
  fixedFields: [],
  fixedFieldTotals: [],
  subjects: [],
  requirements: [],
  modalityOptions: [],
  organizationUnitOptions: [],
});

const stubs = {
  PageFrame: { template: '<main><slot name="actions" /><slot /></main>' },
  CurriculumCanvas: { name: 'CurriculumCanvas', props: ['editing'], template: '<div data-testid="canvas" :data-editing="editing" />' },
  CurriculumConfigurationSheet: { template: '<div />' },
  ProcessLockAlert: { template: '<div>Pause la convocatoria para editar</div>' },
};

const mountPage = () => mount(CoordinationAcademicStructurePage, {
  props: { mode: 'curriculum' },
  global: { stubs },
});

describe('CoordinationAcademicStructurePage, edición de malla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user-1', name: 'Coordinador', email: 'coordinador@test.local', email_verified: true, can_edit_identity: false },
      active_role: { id: 'role-1', code: 'coordinador', career_id: 'career-1', career_name: 'Software' },
      available_roles: [],
    });
    vi.mocked(getCurriculum).mockResolvedValue(curriculum());
    vi.mocked(getScheduledSubjects).mockResolvedValue({} as Awaited<ReturnType<typeof getScheduledSubjects>>);
    vi.mocked(getTeacherAssignments).mockResolvedValue({} as Awaited<ReturnType<typeof getTeacherAssignments>>);
  });

  it('abre en lectura y entra a editar solo después de consultar nuevamente la malla', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('false');
    expect(wrapper.text()).not.toContain('Configurar ciclos');

    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(getCurriculum).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('true');
    expect(wrapper.text()).toContain('Configurar ciclos');

    await wrapper.findAll('button').find((button) => button.text().includes('Volver a la vista'))!.trigger('click');
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('false');
    wrapper.unmount();
  });

  it('impide editar cuando la convocatoria bloquea la malla', async () => {
    vi.mocked(getCurriculum).mockResolvedValue(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('false');
    expect(wrapper.text()).toContain('Pause la convocatoria para editar');
    wrapper.unmount();
  });

  it('consulta el bloqueo actual antes de entrar al editor', async () => {
    vi.mocked(getCurriculum).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('false');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Pause la convocatoria para editar');
    wrapper.unmount();
  });

  it('sale del editor si una recarga informa que la convocatoria se abrió', async () => {
    vi.mocked(getCurriculum).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('true');

    wrapper.findComponent({ name: 'CurriculumCanvas' }).vm.$emit('changed', 'Malla actualizada.');
    await flushPromises();
    expect(wrapper.get('[data-testid="canvas"]').attributes('data-editing')).toBe('false');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
});
