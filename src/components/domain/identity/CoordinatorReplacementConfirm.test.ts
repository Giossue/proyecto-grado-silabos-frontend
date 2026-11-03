import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import CoordinatorReplacementConfirm from '@/components/domain/identity/CoordinatorReplacementConfirm.vue';

enableAutoUnmount(afterEach);
// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const style = document.createElement('style');
style.textContent = '[data-state="closed"] { animation-name: exit; }';
document.head.append(style);

describe('CoordinatorReplacementConfirm', () => {
  it('mientras se cierra sigue mostrando el aviso, y al abrir otro lo reemplaza', async () => {
    const wrapper = mount(CoordinatorReplacementConfirm, { attachTo: document.body, props: { message: 'La carrera ya tiene como coordinador a JUAN.', processing: false } });
    await flushPromises();
    expect(document.body.textContent).toContain('La carrera ya tiene como coordinador a JUAN.');

    await wrapper.setProps({ message: null });
    await flushPromises();
    expect(document.body.textContent).toContain('La carrera ya tiene como coordinador a JUAN.');

    await wrapper.setProps({ message: 'La carrera ya tiene como coordinador a LUIS.' });
    await flushPromises();
    expect(document.body.textContent).toContain('La carrera ya tiene como coordinador a LUIS.');
    expect(document.body.textContent).not.toContain('JUAN');
  });
});
