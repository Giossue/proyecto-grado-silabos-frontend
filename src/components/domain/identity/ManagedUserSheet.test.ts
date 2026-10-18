import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';

describe('ManagedUserSheet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('no solicita ni muestra una contraseña al crear la cuenta', async () => {
    const wrapper = mount(ManagedUserSheet, {
      attachTo: document.body,
      props: {
        open: true,
        teacherCareer: { id: 'career-1', name: 'Software' },
      },
    });
    await flushPromises();

    expect(document.querySelector('#managed-user-password')).toBeNull();

    wrapper.unmount();
  });

  it('pide las cuatro partes del nombre del docente, todas obligatorias', async () => {
    const wrapper = mount(ManagedUserSheet, {
      attachTo: document.body,
      props: { open: true, teacherCareer: { id: 'career-1', name: 'Software' } },
    });
    await flushPromises();

    for (const part of ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido']) {
      const input = document.querySelector<HTMLInputElement>(`#managed-user-${part}`);
      expect(input?.required).toBe(true);
    }
    expect(document.querySelector('#managed-user-name')).toBeNull();

    wrapper.unmount();
  });

  it('también pide las cuatro partes del nombre en el alta de cuentas de Administración', async () => {
    const wrapper = mount(ManagedUserSheet, { attachTo: document.body, props: { open: true } });
    await flushPromises();

    for (const part of ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido']) {
      expect(document.querySelector<HTMLInputElement>(`#managed-user-${part}`)?.required).toBe(true);
    }
    expect(document.querySelector('#managed-user-name')).toBeNull();

    wrapper.unmount();
  });
});
