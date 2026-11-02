import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { Button } from '@/components/ui/button';

enableAutoUnmount(afterEach);

const Modal = defineComponent({
  components: { Button },
  props: { inDialog: { type: Boolean, default: true }, locked: { type: Boolean, default: false } },
  setup: () => ({ text: ref('') }),
  template: `<div :role="inDialog ? 'dialog' : undefined"><form><input id="field" v-model="text" required><Button type="submit" :disabled="locked">Enviar</Button></form></div>`,
});

const submit = (wrapper: ReturnType<typeof mount>) => wrapper.get('button[type="submit"]').element as HTMLButtonElement;

describe('Button de enviar de un formulario', () => {
  it('queda deshabilitado mientras falte un campo obligatorio y se habilita al completarlo', async () => {
    const wrapper = mount(Modal, { attachTo: document.body });
    await nextTick();
    expect(submit(wrapper).disabled).toBe(true);

    await wrapper.get('#field').setValue('Revise la unidad 2');
    expect(submit(wrapper).disabled).toBe(false);

    await wrapper.get('#field').setValue('');
    expect(submit(wrapper).disabled).toBe(true);
  });

  it('respeta su propio disabled aunque el formulario esté completo', async () => {
    const wrapper = mount(Modal, { props: { locked: true }, attachTo: document.body });
    await wrapper.get('#field').setValue('texto');
    expect(submit(wrapper).disabled).toBe(true);
  });

  it('también fuera de un modal', async () => {
    const wrapper = mount(Modal, { props: { inDialog: false }, attachTo: document.body });
    await nextTick();
    expect(submit(wrapper).disabled).toBe(true);
    await wrapper.get('#field').setValue('texto');
    expect(submit(wrapper).disabled).toBe(false);
  });
});
