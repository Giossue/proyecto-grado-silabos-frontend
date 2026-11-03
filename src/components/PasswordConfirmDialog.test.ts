import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog.vue';

enableAutoUnmount(afterEach);

describe('PasswordConfirmDialog', () => {
  it('al confirmar deja la contraseña escrita mientras sigue a la vista, y la limpia al abrirse de nuevo', async () => {
    const wrapper = mount(PasswordConfirmDialog, { attachTo: document.body, props: { open: true, title: 'Desactivar', description: 'Confirme su contraseña', confirmLabel: 'Desactivar' } });
    await flushPromises();
    const input = (): HTMLInputElement => document.body.querySelector<HTMLInputElement>('#confirm-current-password')!;
    input().value = 'Demo-2026!';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();

    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(wrapper.emitted('confirm')).toEqual([['Demo-2026!']]);
    expect(input().value).toBe('Demo-2026!');

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(input().value).toBe('');
  });
});
