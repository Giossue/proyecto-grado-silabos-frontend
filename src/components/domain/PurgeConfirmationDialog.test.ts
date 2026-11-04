import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import PurgeConfirmationDialog from '@/components/domain/PurgeConfirmationDialog.vue';
import { FINALIZED_NOTICE, requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';
import { typeConfirmation } from '@/test/confirmPhrase';

afterEach(() => { document.body.innerHTML = ''; });

const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});

const saveButton = (): HTMLButtonElement => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Guardar')!;

const button = (label: string): HTMLButtonElement => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((item) => item.textContent?.trim() === label)!;

describe('Aviso de convocatoria finalizada', () => {
  const notice = 'La convocatoria 2026-2027 ya finalizó. Este cambio no afecta sus sílabos: conservan los datos que tenían. Se aplicará en la próxima convocatoria, o en esta si la reabre con una prórroga. Evite estos cambios hasta abrir la próxima convocatoria, salvo que sea necesario.';

  it('muestra el texto sin frase que escribir y «Guardar de todos modos» guarda de una vez', async () => {
    const wrapper = mount(PurgeConfirmationDialog, { attachTo: document.body });
    const save = vi.fn();
    requestPurgeConfirmation(notice, 0, save, undefined, FINALIZED_NOTICE);
    await flushPromises();

    expect(document.body.textContent).toContain(notice.slice(0, -1));
    expect(document.body.querySelector('#purge-confirm')).toBeNull();
    expect(button('Guardar de todos modos').disabled).toBe(false);
    expect(button('Guardar de todos modos').querySelector('svg')).not.toBeNull();
    button('Guardar de todos modos').click();
    await flushPromises();

    expect(save).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('«Cancelar» no guarda', async () => {
    const wrapper = mount(PurgeConfirmationDialog, { attachTo: document.body });
    const save = vi.fn();
    const cancelled = vi.fn();
    requestPurgeConfirmation(notice, 0, save, cancelled, FINALIZED_NOTICE);
    await flushPromises();

    button('Cancelar').click();
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(cancelled).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('una confirmación común sigue pidiendo la frase después de un aviso', async () => {
    const wrapper = mount(PurgeConfirmationDialog, { attachTo: document.body });
    requestPurgeConfirmation(notice, 0, vi.fn(), undefined, FINALIZED_NOTICE);
    await flushPromises();
    requestPurgeConfirmation('Este cambio devolverá 1 sílabo enviado o aprobado a borrador.', 1, vi.fn());
    await flushPromises();

    expect(document.body.querySelector('#purge-confirm')).not.toBeNull();
    button('Cancelar').click();
    await flushPromises();
    wrapper.unmount();
  });
});

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

  it('la frase se borra al volver a pedir confirmación, no mientras el modal se cierra', async () => {
    const wrapper = mount(PurgeConfirmationDialog, {
      attachTo: document.body,
      global: { stubs: { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough } },
    });
    requestPurgeConfirmation('Este cambio devolverá 1 sílabo enviado o aprobado a borrador.', 1, vi.fn());
    await flushPromises();
    typeConfirmation('purge-confirm', 'devolver a borrador');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Cancelar')!.click();
    await flushPromises();

    expect(wrapper.getComponent(fadingDialog).attributes('data-state')).toBe('closed');
    expect(document.body.querySelector<HTMLInputElement>('#purge-confirm')!.value).toBe('devolver a borrador');
    requestPurgeConfirmation('Este cambio devolverá 2 sílabos enviados o aprobados a borrador.', 2, vi.fn());
    await flushPromises();
    expect(document.body.querySelector<HTMLInputElement>('#purge-confirm')!.value).toBe('');
    wrapper.unmount();
  });
});
