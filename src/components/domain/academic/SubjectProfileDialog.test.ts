import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubjectProfile, getSubjectProfilePreview, saveSubjectProfile } from '@/api/career-academics';
import SubjectProfileDialog from './SubjectProfileDialog.vue';

vi.mock('@/api/career-academics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/career-academics')>()),
  getSubjectProfile: vi.fn(),
  getSubjectProfilePreview: vi.fn(),
  saveSubjectProfile: vi.fn(),
}));

const formModal = defineComponent({
  setup: () => ({ close: () => undefined }),
  template: '<div><slot name="headerActions" /><slot :close="close" /></div>',
});
const passthrough = defineComponent({ template: '<div><slot /></div>' });
const actions = defineComponent({ props: { disabled: Boolean }, template: '<button type="submit" :disabled="disabled">Guardar proyecto de carrera</button>' });
const editor = defineComponent({
  props: { id: String, label: String, modelValue: { type: Object, default: null }, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<button type="button" :data-id="id" @click="$emit(\'update:modelValue\', { type: \'doc\', content: [] })">{{ label }}</button>',
});

const mountDialog = () => mount(SubjectProfileDialog, {
  props: { subjectId: 'subject-1', subjectName: 'Arquitectura', open: false },
  global: { stubs: {
    FormDialog: formModal, FormDialogActions: actions, FreeTextEditor: editor,
    SyllabusDocumentPreview: { name: 'SyllabusDocumentPreview', props: ['presentation', 'sections'], template: '<div data-preview />' },
    FieldGroup: passthrough, Field: passthrough, FieldLabel: passthrough, FieldDescription: passthrough,
  } },
});

describe('SubjectProfileDialog', () => {
  beforeEach(() => {
    vi.mocked(getSubjectProfile).mockReset();
    vi.mocked(saveSubjectProfile).mockReset();
  });

  it('builds one editor per profile field from the template and saves the edited values', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [
        { id: 'f1', key: 'descripcion', label: 'Descripción de la asignatura', section: 'Descripción', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'f2', key: 'vinculacion', label: 'Vinculación con la sociedad', section: 'Descripción', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
      ],
      values: { f1: { type: 'doc', content: [] } },
      complete: false,
    });
    vi.mocked(saveSubjectProfile).mockResolvedValue({ fields: [], values: {}, complete: true });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(getSubjectProfile).toHaveBeenCalledWith('subject-1');
    expect(wrapper.text()).toContain('Vinculación con la sociedad');
    await wrapper.get('[data-id="ficha-f2"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(saveSubjectProfile).toHaveBeenCalledWith('subject-1', {
      f1: { type: 'doc', content: [] },
      f2: { type: 'doc', content: [] },
    });
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });

  it('sin cambios «Guardar proyecto de carrera» queda deshabilitado y se habilita al editar', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [{ id: 'f1', key: 'descripcion', label: 'Descripción', section: 'Descripción', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } }],
      values: { f1: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto de ejemplo' }] }] } },
      complete: true,
    });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();
    const save = () => wrapper.get('button[type="submit"]');

    expect(save().attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(saveSubjectProfile).not.toHaveBeenCalled();
    await wrapper.get('[data-id="ficha-f1"]').trigger('click');
    expect(save().attributes('disabled')).toBeUndefined();
  });

  it('divide la ficha en pestañas por sección y usa el nombre de la sección si el campo no tiene nombre', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [
        { id: 'f1', key: 'descripcion', label: '', section: 'Descripción de la asignatura', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'f2', key: 'objetivo', label: 'Objetivo General', section: 'Objetivos', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
      ],
      values: {},
      complete: false,
    });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();

    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.text());
    expect(tabs[0]).toContain('Descripción de la asignatura');
    expect(tabs[1]).toContain('Objetivos');
    expect(tabs[0]).toContain('con campos sin llenar');
    expect(wrapper.text()).toContain('Sin llenar');
    expect(wrapper.find('[data-id="ficha-f1"]').exists()).toBe(true);
    expect(wrapper.find('[data-id="ficha-f2"]').exists()).toBe(false);

    await wrapper.findAll('[role="tab"]')[1]!.trigger('mousedown');
    await flushPromises();
    expect(wrapper.find('[data-id="ficha-f2"]').exists()).toBe(true);
  });

  it('marca como sin llenar todo campo vacío y no ofrece el interruptor del docente', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [
        { id: 'f1', key: 'herramientas_tic', label: 'Herramientas TIC', section: 'Metodología', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
      ],
      values: {},
      complete: false,
    });
    vi.mocked(saveSubjectProfile).mockResolvedValue({ fields: [], values: {}, complete: false });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(wrapper.text()).toContain('Sin llenar');
    expect(wrapper.text()).not.toContain('El docente puede editarlo');
    await wrapper.get('[data-id="ficha-f1"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(saveSubjectProfile).toHaveBeenCalledWith('subject-1', expect.any(Object));
  });

  it('explains that the template has no profile fields yet', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({ fields: [], values: {}, complete: false });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.text()).toContain('campos de Coordinación');
  });
  it('la vista previa muestra el sílabo de la materia con el proyecto de carrera y el resto como en la plantilla', async () => {
    const empty = { type: 'doc', content: [{ type: 'paragraph' }] };
    const written = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Materia de base' }] }] };
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [{ id: 'f1', key: 'descripcion', label: 'Descripción de la asignatura', section: 'Descripción', quien_llena: 'coordinacion', content: empty }],
      values: { f1: written },
      complete: false,
    });
    vi.mocked(getSubjectProfilePreview).mockResolvedValue({
      presentation: { appearance: {}, title: 'Sílabo', logos: { institution: '', faculty: '' } } as never,
      sections: [{ id: 's1', title: 'Datos', fields: [{ id: 'f1', label: 'Descripción', value: empty, document: empty }, { id: 'f9', label: 'Docente', value: empty, document: empty }] }],
    });
    const wrapper = mountDialog();
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(getSubjectProfilePreview).not.toHaveBeenCalled();
    await wrapper.get('button[aria-label="Vista previa"]').trigger('click');
    await flushPromises();

    expect(getSubjectProfilePreview).toHaveBeenCalledWith('subject-1');
    const sections = wrapper.getComponent({ name: 'SyllabusDocumentPreview' }).props('sections') as Array<{ fields: Array<{ id: string; document: unknown }> }>;
    expect(sections[0]!.fields[0]!.document).toEqual(written);
    expect(sections[0]!.fields[1]!.document).toEqual(empty);
  });
});
