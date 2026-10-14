import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubjectProfile, saveSubjectProfile } from '@/api/career-academics';
import SubjectProfileSheet from './SubjectProfileSheet.vue';

vi.mock('@/api/career-academics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/career-academics')>()),
  getSubjectProfile: vi.fn(),
  saveSubjectProfile: vi.fn(),
}));

const formSheet = defineComponent({
  setup: () => ({ close: () => undefined }),
  template: '<div><slot :close="close" /></div>',
});
const passthrough = defineComponent({ template: '<div><slot /></div>' });
const actions = defineComponent({ template: '<button type="submit">Guardar ficha</button>' });
const editor = defineComponent({
  props: { id: String, label: String, modelValue: { type: Object, default: null }, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<button type="button" :data-id="id" @click="$emit(\'update:modelValue\', { type: \'doc\', content: [] })">{{ label }}</button>',
});

const mountSheet = () => mount(SubjectProfileSheet, {
  props: { subjectId: 'subject-1', subjectName: 'Arquitectura', open: false },
  global: { stubs: {
    FormDialog: formSheet, FormSheetActions: actions, FreeTextEditor: editor,
    FieldGroup: passthrough, Field: passthrough, FieldLabel: passthrough, FieldDescription: passthrough,
  } },
});

describe('SubjectProfileSheet', () => {
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
    const wrapper = mountSheet();
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

  it('divide la ficha en pestañas por sección y usa el nombre de la sección si el campo no tiene nombre', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({
      fields: [
        { id: 'f1', key: 'descripcion', label: '', section: 'Descripción de la asignatura', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'f2', key: 'objetivo', label: 'Objetivo General', section: 'Objetivos', quien_llena: 'coordinacion', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
      ],
      values: {},
      complete: false,
    });
    const wrapper = mountSheet();
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

  it('explains that the template has no profile fields yet', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({ fields: [], values: {}, complete: false });
    const wrapper = mountSheet();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.text()).toContain('campos de Coordinación');
  });
});
