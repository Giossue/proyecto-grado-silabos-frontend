import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChangeMarks from '@/components/domain/syllabus/ChangeMarks.vue';

enableAutoUnmount(afterEach);

describe('ChangeMarks', () => {
  it('pone una marca por cada campo que cambió y lleva al campo al pulsarla', async () => {
    document.body.innerHTML = '<div data-app-scroll><div data-slot="scroll-area-viewport"></div></div>';
    const root = document.createElement('section');
    root.innerHTML = '<div data-changed id="a"></div><div id="b"></div><div data-changed id="c"></div>';
    document.body.append(root);
    const target = root.querySelector<HTMLElement>('#c')!;
    target.scrollIntoView = vi.fn();

    const wrapper = mount(ChangeMarks, { props: { root }, attachTo: document.body });
    await wrapper.vm.$nextTick();

    const marks = wrapper.findAll('button');
    expect(marks).toHaveLength(2);
    expect(marks[1]!.attributes('aria-label')).toBe('Ir al cambio 2');
    await marks[1]!.trigger('click');
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('no dibuja nada si no hay cambios', async () => {
    document.body.innerHTML = '<div data-app-scroll><div data-slot="scroll-area-viewport"></div></div>';
    const root = document.createElement('section');
    root.innerHTML = '<div id="a"></div>';
    document.body.append(root);

    const wrapper = mount(ChangeMarks, { props: { root }, attachTo: document.body });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('button').exists()).toBe(false);
  });
});
