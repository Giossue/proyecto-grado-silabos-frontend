import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const Harness = defineComponent({
  components: { Dialog, DialogContent, DialogTitle },
  setup: () => ({ open: ref(true) }),
  template: `
    <Dialog v-model:open="open">
      <DialogContent>
        <DialogTitle>Editar</DialogTitle>
        <input aria-label="Nombre" />
      </DialogContent>
    </Dialog>`,
});

const pressEscape = async (target: Element): Promise<void> => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await flushPromises();
};

describe('DialogContent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('cierra con Escape aunque el foco esté en un campo sin cambios', async () => {
    const wrapper = mount(Harness, { attachTo: document.body });
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    input.focus();

    await pressEscape(input);

    expect((wrapper.vm as unknown as { open: boolean }).open).toBe(false);
    wrapper.unmount();
  });

  it('no cierra con Escape si hay cambios sin guardar', async () => {
    const wrapper = mount(Harness, { attachTo: document.body });
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    input.focus();
    input.value = 'Borrador';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await pressEscape(input);

    expect((wrapper.vm as unknown as { open: boolean }).open).toBe(true);
    wrapper.unmount();
  });

  it('ofrece una X para cerrar arriba a la derecha', async () => {
    const wrapper = mount(Harness, { attachTo: document.body });
    await flushPromises();
    const close = document.body.querySelector<HTMLButtonElement>('[data-slot="dialog-close-x"]')!;
    expect(close.textContent).toContain('Cerrar');

    close.click();
    await flushPromises();

    expect((wrapper.vm as unknown as { open: boolean }).open).toBe(false);
    wrapper.unmount();
  });
});
