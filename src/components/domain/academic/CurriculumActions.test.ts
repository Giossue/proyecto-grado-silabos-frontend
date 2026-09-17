import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CurriculumActions from '@/components/domain/academic/CurriculumActions.vue';

describe('CurriculumActions', () => {
  it('deshabilita la configuración mientras la malla está bloqueada', async () => {
    const wrapper = mount(CurriculumActions, {
      props: {
        curriculum: {
          id: 'curriculum-1',
          code: 'SW-8C',
          cycle_count: 8,
          editable: true,
          lock_reason: 'Edición bloqueada. Primero debe pausar la convocatoria desde Convocatorias.',
        },
      },
    });

    const button = wrapper.get('button');
    expect(button.attributes('disabled')).toBeDefined();

    await button.trigger('click');
    expect(wrapper.emitted('configure')).toBeUndefined();
  });
});
