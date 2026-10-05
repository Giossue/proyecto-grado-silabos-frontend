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

describe('SubjectProfileSheet', () => {
  beforeEach(() => {
    vi.mocked(getSubjectProfile).mockReset();
    vi.mocked(saveSubjectProfile).mockReset();
  });

  it('loads the profile, adds an objective and saves the edited values', async () => {
    vi.mocked(getSubjectProfile).mockResolvedValue({ profile: null });
    vi.mocked(saveSubjectProfile).mockResolvedValue({ profile: {} as Awaited<ReturnType<typeof saveSubjectProfile>>['profile'] });
    const wrapper = mount(SubjectProfileSheet, {
      props: { subjectId: 'subject-1', subjectName: 'Arquitectura', open: false },
      global: { stubs: {
        FormSheet: formSheet, FormSheetActions: actions,
        FieldGroup: passthrough, Field: passthrough, FieldLabel: passthrough,
      } },
    });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(getSubjectProfile).toHaveBeenCalledWith('subject-1');
    await wrapper.get('#ficha-descripcion').setValue('Descripción de prueba');
    await wrapper.findAll('button').find((button) => button.text() === 'Agregar')!.trigger('click');
    await wrapper.get('[aria-label="Objetivos específicos 1"]').setValue('Analizar arquitecturas');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(saveSubjectProfile).toHaveBeenCalledWith('subject-1', expect.objectContaining({
      descripcion: 'Descripción de prueba',
      objetivos_especificos: ['Analizar arquitecturas'],
    }));
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });
});
