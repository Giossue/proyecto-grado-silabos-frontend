import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheduledSubjects, getSubjectProfile, getSubjectProfilePreview, saveSubjectProfile, type ScheduledSubjects, type SubjectProfile } from '@/api/career-academics';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import CoordinationSubjectProfilePage from '@/pages/CoordinationSubjectProfilePage.vue';
import type { DocumentNode } from '@/lib/templateDocument';

const push = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { subject: 'm2' }, query: {}, fullPath: '/coordinacion/proyecto-carrera/m2' }),
  useRouter: () => ({ replace: vi.fn(), push, back: vi.fn() }),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn(),
}));
vi.mock('@/api/career-academics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/career-academics')>()),
  getScheduledSubjects: vi.fn(),
  getSubjectProfile: vi.fn(),
  getSubjectProfilePreview: vi.fn(),
  saveSubjectProfile: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const blank: DocumentNode = { type: 'doc', content: [{ type: 'paragraph' }] };
const written: DocumentNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto de la carrera' }] }] };
const editor = defineComponent({
  props: { id: String, label: String, modelValue: { type: Object, default: null }, disabled: Boolean, spaces: Boolean },
  emits: ['update:modelValue'],
  template: '<button type="button" :data-id="id" :data-spaces="spaces" :disabled="disabled" @click="$emit(\'update:modelValue\', { type: \'doc\', content: [{ type: \'paragraph\', content: [{ type: \'text\', text: \'Nuevo\' }] }] })">{{ label }}</button>',
});
const scheduled = (lock: string | null = null) => ({
  career: { lock_reason: lock, lock: lock ? { label: 'Edición bloqueada', reason: lock } : null },
  options: { activeSubjects: [{ id: 'm2', nombre: 'Matemática Discreta', ciclo: 1 }] },
}) as unknown as ScheduledSubjects;
const profile = (extra: Partial<SubjectProfile> = {}): SubjectProfile => ({
  fields: [
    { id: 'f1', key: 'descripcion', label: 'Descripción de la asignatura', section: 'Descripción', quien_llena: 'carrera', content: blank, template: blank, position: 1 },
    { id: 'f2', key: 'metodologia', label: 'Métodos', section: 'Metodología', quien_llena: 'carrera', content: blank, template: blank, position: 7 },
  ],
  values: { f1: written },
  complete: true,
  ...extra,
});
const mountPage = () => mount(CoordinationSubjectProfilePage, {
  attachTo: document.body,
  global: { stubs: { FreeTextEditor: editor, ProcessLockAlert: true, SyllabusDocumentPreview: { name: 'SyllabusDocumentPreview', props: ['presentation', 'sections'], template: '<div data-preview />' } } },
});

describe('Página del proyecto de carrera de una materia', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(getScheduledSubjects).mockResolvedValue(scheduled());
    vi.mocked(getSubjectProfile).mockResolvedValue(profile());
    vi.mocked(saveSubjectProfile).mockReset();
  });


  it('pasa a la materia anterior o siguiente de la carrera, en orden de ciclo, sin las que no generan sílabo', async () => {
    vi.mocked(getScheduledSubjects).mockResolvedValue({
      ...scheduled(),
      options: { activeSubjects: [
        { id: 'm3', nombre: 'Estructuras de Datos', ciclo: 2 },
        { id: 'm1', nombre: 'Álgebra', ciclo: 1 },
        { id: 'm4', nombre: 'Prácticas', ciclo: 1, generates_syllabus: false },
        { id: 'm2', nombre: 'Matemática Discreta', ciclo: 1 },
      ] },
    } as unknown as ScheduledSubjects);
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[aria-label="Materia anterior"]').trigger('click');
    expect(push).toHaveBeenLastCalledWith('/coordinacion/proyecto-carrera/m1');
    await wrapper.get('[aria-label="Materia siguiente"]').trigger('click');
    expect(push).toHaveBeenLastCalledWith('/coordinacion/proyecto-carrera/m3');
    expect(push).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('muestra las secciones a la izquierda, el editor con el botón de espacios a la derecha y guarda lo escrito', async () => {
    vi.mocked(saveSubjectProfile).mockResolvedValue(profile({ values: { f1: written, f2: written } }));
    const wrapper = mountPage();
    await flushPromises();

    expect(getSubjectProfile).toHaveBeenCalledWith('m2');
    expect(wrapper.text()).toContain('Proyecto de carrera de Matemática Discreta');
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Descripción', 'Metodología']);
    expect(wrapper.get('[data-id="ficha-f1"]').attributes('data-spaces')).toBe('true');
    const save = wrapper.findAll('button').find((button) => button.text() === 'Guardar proyecto de carrera')!;
    expect(save.attributes('disabled')).toBeDefined();

    await wrapper.findAll('[role="tab"]')[1]!.trigger('mousedown', { button: 0 });
    await flushPromises();
    await wrapper.get('[data-id="ficha-f2"]').trigger('click');
    expect(save.attributes('disabled')).toBeUndefined();
    await save.trigger('click');
    await flushPromises();

    expect(saveSubjectProfile).toHaveBeenCalledWith('m2', { f1: written, f2: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nuevo' }] }] } });
    expect(save.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('con la convocatoria abierta muestra el bloqueo y no deja editar ni guardar', async () => {
    vi.mocked(getScheduledSubjects).mockResolvedValue(scheduled('Convocatoria abierta'));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findComponent(ProcessLockAlert).exists()).toBe(true);
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('button').find((button) => button.text() === 'Guardar proyecto de carrera')!.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('marca el campo con un espacio de elegir sin opciones y abre la vista previa con el ojo', async () => {
    const choice: DocumentNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'response', attrs: { kind: 'una', options: [], value: null } }] }] };
    vi.mocked(getSubjectProfile).mockResolvedValue(profile({ values: { f1: choice }, complete: false }));
    vi.mocked(getSubjectProfilePreview).mockResolvedValue({ presentation: {}, sections: [] } as never);
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Faltan opciones');
    await wrapper.get('button[aria-label="Vista previa"]').trigger('click');
    await flushPromises();
    expect(getSubjectProfilePreview).toHaveBeenCalledWith('m2');
    expect(wrapper.find('[data-preview]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('el enlace de arriba vuelve a la lista de materias', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text().includes('Volver al proyecto de carrera'))!.trigger('click');
    expect(push).toHaveBeenCalledWith('/coordinacion/proyecto-carrera');
    wrapper.unmount();
  });
});
