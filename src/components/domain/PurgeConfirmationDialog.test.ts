import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurgeConfirmationDialog from '@/components/domain/PurgeConfirmationDialog.vue';
import { requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';
import { typeConfirmation } from '@/test/confirmPhrase';

afterEach(() => { document.body.innerHTML = ''; });

const saveButton = (): HTMLButtonElement => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Guardar')!;

describe('Confirmación de cambios que devuelven sílabos a borrador', () => {
  it('pide escribir «devolver a borrador» en vez de esperar, y recién ahí guarda', async () => {
    const wrapper = mount(PurgeConfirmationDialog, { attachTo: document.body });
    const save = vi.fn();
    requestPurgeConfirmation('Este cambio devolverá 1 sílabo enviado o aprobado a borrador.', 1, save);
    await flushPromises();

    expect(document.body.textContent).toContain('Escriba «devolver a borrador» para confirmar');
    expect(saveButton().disabled).toBe(true);
    typeConfirmation('purge-confirm', 'Devolver a borrador');
    await flushPromises();
    expect(saveButton().disabled).toBe(false);
    saveButton().click();
    await flushPromises();

    expect(save).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
