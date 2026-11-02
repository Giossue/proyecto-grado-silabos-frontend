import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import DatePicker from '@/components/DatePicker.vue';
import { Button } from '@/components/ui/button';

enableAutoUnmount(afterEach);

const Form = defineComponent({
  components: { DatePicker, Button },
  props: { required: { type: Boolean, default: true } },
  setup: () => ({ day: ref('') }),
  template: '<form><DatePicker id="d" v-model="day" :required="required" /><Button type="submit">Guardar</Button></form>',
});

describe('DatePicker obligatorio', () => {
  it('mantiene deshabilitado el botón de enviar hasta que haya una fecha', async () => {
    const wrapper = mount(Form, { attachTo: document.body });
    await nextTick();
    const submit = (): HTMLButtonElement => wrapper.get('button[type="submit"]').element as HTMLButtonElement;

    expect(submit().disabled).toBe(true);
    (wrapper.vm as unknown as { day: string }).day = '2026-12-01';
    await flushPromises();
    expect(submit().disabled).toBe(false);
  });

  it('si no es obligatorio no estorba', async () => {
    const wrapper = mount(Form, { props: { required: false }, attachTo: document.body });
    await nextTick();

    expect((wrapper.get('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(false);
  });
});
