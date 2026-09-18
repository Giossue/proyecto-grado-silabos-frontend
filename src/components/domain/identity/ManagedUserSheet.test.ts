import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';

const tooltipText = (): string | undefined => {
  const contents = [...document.body.querySelectorAll('[data-slot="tooltip-content"]')];
  const openContent = contents.find((content) => content.getAttribute('data-state') === 'open');
  return (openContent ?? contents.at(-1))?.querySelector('[role="tooltip"]')?.textContent?.trim();
};

const getButton = (label: string): HTMLButtonElement => {
  const button = document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
};

describe('ManagedUserSheet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('describe los controles de contraseña con tooltips y actualiza el de visibilidad', async () => {
    const wrapper = mount(ManagedUserSheet, {
      attachTo: document.body,
      props: {
        open: true,
        teacherCareer: { id: 'career-1', name: 'Software' },
      },
    });
    await flushPromises();

    const showButton = getButton('Mostrar contraseña');
    showButton.focus();
    await flushPromises();
    expect(tooltipText()).toBe('Mostrar contraseña');

    showButton.click();
    await nextTick();
    await flushPromises();
    expect(document.querySelector<HTMLInputElement>('#managed-user-password')?.type).toBe('text');

    const hideButton = getButton('Ocultar contraseña');
    hideButton.blur();
    hideButton.focus();
    await flushPromises();
    expect(tooltipText()).toBe('Ocultar contraseña');

    for (const label of ['Copiar contraseña', 'Generar otra contraseña']) {
      const button = getButton(label);
      button.focus();
      await flushPromises();
      expect(tooltipText()).toBe(label);
    }

    wrapper.unmount();
  });
});
