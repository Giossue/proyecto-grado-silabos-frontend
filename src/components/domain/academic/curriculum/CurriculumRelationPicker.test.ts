import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import CurriculumRelationPicker from '@/components/domain/academic/curriculum/CurriculumRelationPicker.vue';
import type { CurriculumBuilderSubject } from '@/types/academic';

enableAutoUnmount(afterEach);

const subject = (id: string, cycle: number, position: number) => ({ id, code: id.toUpperCase(), name: `Materia ${id}`, cycle, position }) as unknown as CurriculumBuilderSubject;

describe('CurriculumRelationPicker', () => {
  it.each([
    ['requires', { sourceId: 'b', targetId: 'a' }],
    ['required-by', { sourceId: 'a', targetId: 'b' }],
  ] as const)('elige la dirección correcta en el modo %s', async (mode, expected) => {
    const wrapper = mount(CurriculumRelationPicker, {
      attachTo: document.body,
      props: { subjects: [subject('a', 1, 0), subject('b', 2, 0)], picker: { subjectId: 'a', mode }, 'onUpdate:picker': (value: unknown) => wrapper.setProps({ picker: value as never }) },
    });
    await nextTick();

    const select = document.body.querySelector('select') as HTMLSelectElement;
    expect([...select.options].some((option) => option.textContent?.includes('Materia a'))).toBe(false);
    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    await nextTick();
    (([...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Continuar'))) as HTMLButtonElement).click();
    await nextTick();

    expect(wrapper.emitted('pick')?.[0]?.[0]).toEqual(expected);
  });
});
