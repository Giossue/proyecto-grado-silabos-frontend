import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import CurriculumRelationPicker from '@/components/domain/academic/curriculum/CurriculumRelationPicker.vue';
import type { CurriculumBuilderSubject } from '@/types/academic';

enableAutoUnmount(afterEach);
afterEach(() => { vi.restoreAllMocks(); });

// Simula la animación de salida: el modal cerrado sigue en pantalla hasta que termina.
const keepClosingDialogs = (): void => {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = real(element, pseudo);
    return element.getAttribute('data-state') === 'closed' ? new Proxy(style, { get: (target, key) => (key === 'animationName' ? 'exit' : Reflect.get(target, key)) }) : style;
  });
};

const subject = (id: string, cycle: number, position: number) => ({ id, code: id.toUpperCase(), name: `Materia ${id}`, cycle, position }) as unknown as CurriculumBuilderSubject;
const stubs = {
  Select: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div data-select><slot /></div>' },
  SelectTrigger: { template: '<div><slot /></div>' },
  SelectValue: { template: '<span />' },
  SelectContent: { template: '<div><slot /></div>' },
  SelectGroup: { template: '<div><slot /></div>' },
  SelectLabel: { template: '<p><slot /></p>' },
  SelectItem: { props: ['value'], template: '<div :data-value="value"><slot /></div>' },
};
const mountPicker = (subjects: CurriculumBuilderSubject[], picker: { subjectId: string; mode: 'requires' | 'required-by' }) => {
  const wrapper = mount(CurriculumRelationPicker, {
    attachTo: document.body,
    props: { subjects, picker, 'onUpdate:picker': (value: unknown) => wrapper.setProps({ picker: value as never }) },
    global: { stubs },
  });

  return wrapper;
};

describe('CurriculumRelationPicker', () => {
  it.each([
    ['requires', 'b', 'a', { sourceId: 'a', targetId: 'b' }],
    ['required-by', 'a', 'b', { sourceId: 'a', targetId: 'b' }],
  ] as const)('elige la dirección correcta en el modo %s', async (mode, current, other, expected) => {
    const wrapper = mountPicker([subject('a', 1, 0), subject('b', 2, 0)], { subjectId: current, mode });
    await nextTick();

    expect(document.body.querySelector(`[data-value="${current}"]`)).toBeNull();
    wrapper.findComponent(stubs.Select).vm.$emit('update:modelValue', other);
    await nextTick();
    (([...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Agregar relación'))) as HTMLButtonElement).click();
    await nextTick();

    expect(wrapper.emitted('pick')?.[0]?.[0]).toEqual(expected);
  });

  it('en modo requiere solo ofrece materias del mismo ciclo o de ciclos anteriores, agrupadas por ciclo', async () => {
    mountPicker([subject('a', 1, 0), subject('b', 2, 0), subject('c', 3, 0)], { subjectId: 'b', mode: 'requires' });
    await nextTick();

    expect(document.body.querySelector('[data-value="a"]')).not.toBeNull();
    expect(document.body.querySelector('[data-value="c"]')).toBeNull();
    expect(document.body.textContent).toContain('Ciclo I');
  });

  it('al agregar la relación, el modal conserva la pregunta y las materias mientras se cierra', async () => {
    keepClosingDialogs();
    const wrapper = mountPicker([subject('a', 1, 0), subject('b', 2, 0), subject('c', 3, 0)], { subjectId: 'b', mode: 'requires' });
    await nextTick();
    wrapper.findComponent(stubs.Select).vm.$emit('update:modelValue', 'a');
    await nextTick();
    (([...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Agregar relación'))) as HTMLButtonElement).click();
    await flushPromises();

    expect(wrapper.emitted('pick')?.[0]?.[0]).toEqual({ sourceId: 'a', targetId: 'b' });
    const closing = document.body.querySelector('[role="dialog"][data-state="closed"]')!;
    expect(closing.textContent).toContain('¿Qué materia requiere?');
    expect(closing.querySelector('[data-value="a"]')).not.toBeNull();
    expect(closing.querySelector('[data-value="b"]')).toBeNull();
  });
});
