import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurriculum, getScheduledSubjects, getTeacherAssignments, type Curriculum } from '@/api/career-academics';
import { getSession } from '@/api/session';
import CoordinationAcademicStructurePage from '@/pages/CoordinationAcademicStructurePage.vue';
import { curriculumEditorState } from '@/state/curriculumEditor';

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
  PageFrame: { template: '<main><slot name="banner" /><header data-tour="page-header"><slot name="eyebrow" /><slot name="actions" /></header><slot /></main>' },
  CurriculumCanvas: { name: 'CurriculumCanvas', props: { editing: Boolean, fullScreen: Boolean }, template: '<div data-testid="canvas" :data-editing="editing" />' },
  CurriculumConfigurationDialog: { template: '<div />' },
  ProcessLockAlert: { template: '<div>Pause la convocatoria para editar</div>' },
};

const mountPage = () => mount(CoordinationAcademicStructurePage, {
  props: { mode: 'curriculum' },
  global: { stubs },
});

const editButton = (wrapper: { findAll: (selector: string) => Array<{ text: () => string }> }) =>
  wrapper.findAll('button').find((button) => /Editar malla|Comprobando/.test(button.text())) as never as ReturnType<ReturnType<typeof mount>['get']>;

describe('CoordinationAcademicStructurePage, edición de malla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('appearance', 'light');
    document.documentElement.classList.remove('dark');
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
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(false);
    expect(wrapper.text()).not.toContain('Configurar ciclos');

    await editButton(wrapper).trigger('click');
    await flushPromises();
    expect(getCurriculum).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(true);
    expect(wrapper.find('button[aria-label="Configurar ciclos"]').exists()).toBe(true);
    // Como el sílabo del docente: se queda el encabezado de la app y Volver va sobre el título.
    expect(curriculumEditorState.open.value).toBe(false);
    expect(wrapper.find('[aria-label="Herramientas del editor de malla"]').exists()).toBe(false);
    const pageHeader = wrapper.get('[data-tour="page-header"]');
    expect(pageHeader.text()).toContain('Volver a la vista');
    expect(pageHeader.find('button[aria-label="Configurar ciclos"]').exists()).toBe(true);

    await pageHeader.findAll('button').find((button) => button.text().includes('Volver a la vista'))!.trigger('click');
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(false);
    expect(curriculumEditorState.open.value).toBe(false);
    wrapper.unmount();
  });

  it('impide editar cuando la convocatoria bloquea la malla', async () => {
    vi.mocked(getCurriculum).mockResolvedValue(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    expect(editButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(false);
    expect(wrapper.text()).toContain('Pause la convocatoria para editar');
    wrapper.unmount();
  });

  it('consulta el bloqueo actual antes de entrar al editor', async () => {
    vi.mocked(getCurriculum).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    await editButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(false);
    expect(editButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Pause la convocatoria para editar');
    wrapper.unmount();
  });

  it('sale del editor si una recarga informa que la convocatoria se abrió', async () => {
    vi.mocked(getCurriculum).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum()).mockResolvedValueOnce(curriculum(false));
    const wrapper = mountPage();
    await flushPromises();
    await editButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(true);

    wrapper.findComponent({ name: 'CurriculumCanvas' }).vm.$emit('changed', 'Malla actualizada.');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'CurriculumCanvas' }).props('editing')).toBe(false);
    expect(editButton(wrapper).attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
});
