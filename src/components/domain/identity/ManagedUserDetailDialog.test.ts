import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeManagedUserRole, type ManagedUser } from '@/api/admin-users';
import ManagedUserDetailDialog from '@/components/domain/identity/ManagedUserDetailDialog.vue';

vi.mock('@/api/admin-users', () => ({ updateManagedUser: vi.fn(), removeManagedUserRole: vi.fn() }));

enableAutoUnmount(afterEach);
// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const style = document.createElement('style');
style.textContent = '[data-state="closed"] { animation-name: exit; }';
document.head.append(style);
const button = (label: string): HTMLButtonElement => [...document.body.querySelectorAll('button')].find((item) => item.textContent?.trim() === label) as HTMLButtonElement;

const user = {
  id: 'u1', nombre: 'Ana Pérez', correo_electronico: 'ana@ueb.edu.ec', active: true, pending_activation: false, two_factor_enabled: false,
  roles: [{ id: 'r1', code: 'docente', name: 'Docente', career_name: 'Software' }], careers: ['Software'],
  assignments: [{ id: 'r1', role_name: 'Docente', career_name: 'Software', active: true }],
} as unknown as ManagedUser;
const props = { user, roles: [{ codigo: 'docente', nombre: 'Docente' }], careers: [{ id: 'c1', nombre: 'Software' }], open: true };

describe('ManagedUserDetailDialog', () => {
  it('muestra la ficha y pasa a editar dentro de la misma hoja', async () => {
    mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...props, canEdit: true } });
    await flushPromises();

    expect(document.body.textContent).toContain('Datos de la cuenta');
    expect(document.body.textContent).toContain('ana@ueb.edu.ec');
    const edit = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Editar')) as HTMLButtonElement;
    edit.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Editar usuario');
    expect(document.body.querySelector('#managed-edit-nombres-u1')).not.toBeNull();

    const cancel = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
    cancel.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Datos de la cuenta');
    expect(document.body.querySelector('#managed-edit-nombres-u1')).toBeNull();
  });

  it('no ofrece editar cuando no corresponde, como en la propia cuenta', async () => {
    mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...props, canEdit: false } });
    await flushPromises();

    expect([...document.body.querySelectorAll('button')].some((button) => button.textContent?.includes('Editar'))).toBe(false);
  });

  it('las acciones van en el pie como botones con texto, sin menú', async () => {
    const wrapper = mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...props, canEdit: true } });
    await flushPromises();

    expect(document.body.querySelector('button[aria-label="Deshabilitar acceso"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-label^="Acciones para"]')).toBeNull();

    (document.body.querySelector('button[aria-label="Deshabilitar acceso"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(wrapper.emitted('action')?.[0]).toEqual(['access']);
    wrapper.unmount();

    const pending = { ...props, user: { ...user, pending_activation: true, invitation_expired: false } as ManagedUser };
    const fresh = mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...pending, canEdit: true } });
    await flushPromises();
    expect(document.body.querySelector('button[aria-label="Eliminar cuenta pendiente"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Reenviar invitación');
    fresh.unmount();

    const expired = { ...props, user: { ...user, pending_activation: true, invitation_expired: true } as ManagedUser };
    mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...expired, canEdit: true } });
    await flushPromises();
    expect(document.body.querySelector('button[aria-label^="Acciones para"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label="Reenviar invitación"]')?.textContent).toContain('Reenviar invitación');
    expect(document.body.querySelector('button[aria-label="Eliminar cuenta pendiente"]')?.textContent).toContain('Eliminar cuenta pendiente');
    expect(document.body.textContent).toContain('Invitación vencida');
  });

  it('no ofrece acciones en la propia cuenta', async () => {
    mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...props, canEdit: false } });
    await flushPromises();

    expect(document.body.querySelector('button[aria-label="Deshabilitar acceso"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label^="Acciones para"]')).toBeNull();
  });

  it('al guardar se cierra con el formulario y su aviso a la vista, y al abrir de nuevo muestra la ficha', async () => {
    vi.mocked(removeManagedUserRole).mockResolvedValue({ message: 'Rol quitado' });
    const two = { ...user, roles: [...user.roles, { id: 'r2', code: 'coordinador', name: 'Coordinador', career_name: 'Software' }] } as unknown as ManagedUser;
    const wrapper = mount(ManagedUserDetailDialog, { attachTo: document.body, props: { ...props, user: two, canEdit: true } });
    await flushPromises();
    button('Editar').click();
    await flushPromises();
    (document.body.querySelector('button[aria-label="Quitar el rol Coordinador de Software"]') as HTMLButtonElement).click();
    await flushPromises();

    button('Quitar rol').click();
    await flushPromises();

    expect(wrapper.emitted('saved')).toEqual([['Rol quitado']]);
    expect(document.body.textContent).toContain('Editar usuario');
    expect(document.body.querySelector('#managed-edit-nombres-u1')).not.toBeNull();
    expect(document.body.textContent).toContain('Ana Pérez deja de ser Coordinador de Software.');

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.body.textContent).toContain('Datos de la cuenta');
    expect(document.body.querySelector('#managed-edit-nombres-u1')).toBeNull();
  });
});
