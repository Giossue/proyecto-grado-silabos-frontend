import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManagedUser } from '@/api/admin-users';
import ManagedUserDetailSheet from '@/components/domain/identity/ManagedUserDetailSheet.vue';

vi.mock('@/api/admin-users', () => ({ updateManagedUser: vi.fn(), removeManagedUserRole: vi.fn() }));

enableAutoUnmount(afterEach);

const user = {
  id: 'u1', nombre: 'Ana Pérez', correo_electronico: 'ana@ueb.edu.ec', active: true, pending_activation: false, two_factor_enabled: false,
  roles: [{ id: 'r1', code: 'docente', name: 'Docente', career_name: 'Software' }], careers: ['Software'],
  assignments: [{ id: 'r1', role_name: 'Docente', career_name: 'Software', active: true }],
} as unknown as ManagedUser;
const props = { user, roles: [{ codigo: 'docente', nombre: 'Docente' }], careers: [{ id: 'c1', nombre: 'Software' }], open: true };

describe('ManagedUserDetailSheet', () => {
  it('muestra la ficha y pasa a editar dentro de la misma hoja', async () => {
    mount(ManagedUserDetailSheet, { attachTo: document.body, props: { ...props, canEdit: true } });
    await flushPromises();

    expect(document.body.textContent).toContain('Datos de la cuenta');
    expect(document.body.textContent).toContain('ana@ueb.edu.ec');
    const edit = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Editar')) as HTMLButtonElement;
    edit.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Editar usuario');
    expect(document.body.querySelector('#managed-edit-name-u1')).not.toBeNull();

    const cancel = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
    cancel.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Datos de la cuenta');
    expect(document.body.querySelector('#managed-edit-name-u1')).toBeNull();
  });

  it('no ofrece editar cuando no corresponde, como en la propia cuenta', async () => {
    mount(ManagedUserDetailSheet, { attachTo: document.body, props: { ...props, canEdit: false } });
    await flushPromises();

    expect([...document.body.querySelectorAll('button')].some((button) => button.textContent?.includes('Editar'))).toBe(false);
  });
});
