import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue';

enableAutoUnmount(afterEach);
// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const style = document.createElement('style');
style.textContent = '[data-state="closed"] { animation-name: exit; }';
document.head.append(style);

describe('TwoFactorSetupModal', () => {
  it('se cierra en el paso del código y al abrirse de nuevo vuelve al código QR', async () => {
    const wrapper = mount(TwoFactorSetupModal, { attachTo: document.body, props: { isOpen: true, qrCodeSvg: '<svg></svg>', processing: false, error: null } });
    await flushPromises();
    [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Verificar código de autenticación');

    await wrapper.setProps({ isOpen: false });
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed');
    expect(document.body.textContent).toContain('Verificar código de autenticación');
    expect(document.body.querySelector('#two-factor-verify-form')).not.toBeNull();

    await wrapper.setProps({ isOpen: true });
    await flushPromises();
    expect(document.body.textContent).toContain('Activar autenticación de dos factores');
    expect(document.body.querySelector('#two-factor-verify-form')).toBeNull();
  });
});
