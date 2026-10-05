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
    FormSheet: formSheet, FormSheetActions: actions, FreeTextEditor: editor,
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
        { id: 'f1', key: 'descripcion', label: 'Descripción de la asignatura', help: null, section: 'Descripción' },
        { id: 'f2', key: 'vinculacion', label: 'Vinculación con la sociedad', help: null, section: null },
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

  it('explains that the template has no profile fields yet', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({ fields: [], values: {}, complete: false });
    const wrapper = mountSheet();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.text()).toContain('marcados «se llena desde la ficha»');
  });
});
