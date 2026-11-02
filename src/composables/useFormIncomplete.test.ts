import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const Form = defineComponent({
  components: { Button, Textarea },
  setup: () => ({ reason: ref('') }),
  template: '<form @submit.prevent><Textarea id="reason" v-model="reason" aria-required="true" /><Button type="submit">Enviar</Button></form>',
});

describe('useFormIncomplete', () => {
  it('deshabilita el envío mientras un campo aria-required esté vacío, sin usar la validación del navegador', async () => {
    const wrapper = mount(Form, { attachTo: document.body });
    await flushPromises();
    const field = wrapper.get<HTMLTextAreaElement>('#reason').element;
    const submit = wrapper.get<HTMLButtonElement>('button').element;

    expect(field.required).toBe(false);
    expect(field.validationMessage).toBe('');
    expect(submit.disabled).toBe(true);

    await wrapper.get('#reason').setValue('Motivo suficiente');
    await flushPromises();
    expect(submit.disabled).toBe(false);

    await wrapper.get('#reason').setValue('   ');
    await flushPromises();
    expect(submit.disabled).toBe(true);
    wrapper.unmount();
  });
});
