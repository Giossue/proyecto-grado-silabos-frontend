import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import CurriculumRelationPicker from '@/components/domain/academic/curriculum/CurriculumRelationPicker.vue';
import type { CurriculumBuilderSubject } from '@/types/academic';

enableAutoUnmount(afterEach);

const subject = (id: string, cycle: number, position: number) => ({ id, code: id.toUpperCase(), name: `Materia ${id}`, cycle, position }) as unknown as CurriculumBuilderSubject;

describe('CurriculumRelationPicker', () => {
  it.each([
    ['requires', 'b', 'a', { sourceId: 'a', targetId: 'b' }],
    ['required-by', 'a', 'b', { sourceId: 'a', targetId: 'b' }],
  ] as const)('elige la dirección correcta en el modo %s', async (mode, current, other, expected) => {
    const wrapper = mount(CurriculumRelationPicker, {
      attachTo: document.body,
      props: { subjects: [subject('a', 1, 0), subject('b', 2, 0)], picker: { subjectId: current, mode }, 'onUpdate:picker': (value: unknown) => wrapper.setProps({ picker: value as never }) },
    });
    await nextTick();

    const select = document.body.querySelector('select') as HTMLSelectElement;
    expect([...select.options].some((option) => option.textContent?.includes(`Materia ${current}`))).toBe(false);
    select.value = other;
    select.dispatchEvent(new Event('change'));
    await nextTick();
    (([...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Agregar relación'))) as HTMLButtonElement).click();
    await nextTick();

    expect(wrapper.emitted('pick')?.[0]?.[0]).toEqual(expected);
  });

  it('en modo requiere no ofrece materias de ciclos posteriores', async () => {
    mount(CurriculumRelationPicker, {
      attachTo: document.body,
      props: { subjects: [subject('a', 1, 0), subject('b', 2, 0), subject('c', 3, 0)], picker: { subjectId: 'b', mode: 'requires' } },
    });
    await nextTick();

    const labels = [...(document.body.querySelector('select') as HTMLSelectElement).options].map((option) => option.textContent ?? '');
    expect(labels.some((label) => label.includes('Materia a'))).toBe(true);
    expect(labels.some((label) => label.includes('Materia c'))).toBe(false);
  });
});
