import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeManagedUserRole, updateManagedUser, type ManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import ManagedUserEditForm from '@/components/domain/identity/ManagedUserEditForm.vue';

vi.mock('@/api/admin-users', () => ({ updateManagedUser: vi.fn(), removeManagedUserRole: vi.fn() }));
const update = vi.mocked(updateManagedUser);
const remove = vi.mocked(removeManagedUserRole);
// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const style = document.createElement('style');
style.textContent = '[data-state="closed"] { animation-name: exit; }';
document.head.append(style);

const user: ManagedUser = { id: 'u1', nombre: 'ANA PÉREZ', correo_electronico: 'ana@ueb.edu.ec', active: true, pending_activation: false, two_factor_enabled: false, roles: [{ id: 'r1', code: 'docente', name: 'Docente', career_name: 'Software' }], careers: ['Software'], assignments: [] };
const roles = [{ codigo: 'docente', nombre: 'Docente' }, { codigo: 'coordinador', nombre: 'Coordinador' }];

describe('ManagedUserEditForm', () => {
  afterEach(() => { document.body.innerHTML = ''; update.mockReset(); });

  it('si la carrera ya tiene coordinador pide confirmar y reenvía con el reemplazo', async () => {
    update.mockImplementationOnce(async () => { throw new ApiError('La carrera ya tiene como coordinador a JUAN', 422, { replace_coordinator: ['La carrera ya tiene como coordinador a JUAN'] }); });
    update.mockImplementationOnce(async () => ({ message: 'Cuenta actualizada' }));
    const wrapper = mount(ManagedUserEditForm, { attachTo: document.body, props: { user, roles, careers: [{ id: 'c1', nombre: 'Software' }] } });
    (wrapper.vm as unknown as { form: { role_code: string; career_id: string } }).form = { ...(wrapper.vm as unknown as { form: { nombre: string; correo_electronico: string } }).form, role_code: 'coordinador', career_id: 'c1' };
    await flushPromises();

    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(document.body.textContent).toContain('La carrera ya tiene como coordinador a JUAN');

    ([...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Reemplazar') as HTMLButtonElement).click();
    await flushPromises();

    expect(update).toHaveBeenLastCalledWith('u1', expect.objectContaining({ role_code: 'coordinador', career_id: 'c1', replace_coordinator: true }));
    expect(wrapper.emitted('saved')).toEqual([['Cuenta actualizada']]);
  });

  it('muestra el nombre en sus cuatro campos, sin el texto de ayuda, y guarda el nombre completo', async () => {
    update.mockResolvedValue({ message: 'Cuenta actualizada' });
    const full: ManagedUser = { ...user, nombre: 'ANA MARÍA PÉREZ LÓPEZ' };
    const wrapper = mount(ManagedUserEditForm, { attachTo: document.body, props: { user: full, roles, careers: [] } });
    await flushPromises();
    const field = (key: string): HTMLInputElement => document.body.querySelector<HTMLInputElement>(`#managed-edit-${key}-u1`)!;

    expect([field('primer_nombre').value, field('segundo_nombre').value, field('primer_apellido').value, field('segundo_apellido').value]).toEqual(['ANA', 'MARÍA', 'PÉREZ', 'LÓPEZ']);
    expect(document.body.textContent).not.toContain('Primer y segundo nombre, primer y segundo apellido');
    expect(document.body.querySelector('#managed-edit-name-u1')).toBeNull();

    field('segundo_apellido').value = 'gómez';
    field('segundo_apellido').dispatchEvent(new Event('input'));
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(update).toHaveBeenCalledWith('u1', expect.objectContaining({ nombre: 'ANA MARÍA PÉREZ GÓMEZ' }));
    wrapper.unmount();
  });

  it('al quitar un rol, el aviso sigue nombrando ese rol mientras se cierra', async () => {
    remove.mockResolvedValue({ message: 'Rol quitado' });
    const two: ManagedUser = { ...user, roles: [...user.roles, { id: 'r2', code: 'coordinador', name: 'Coordinador', career_name: 'Software' }] };
    const wrapper = mount(ManagedUserEditForm, { attachTo: document.body, props: { user: two, roles, careers: [] } });
    await flushPromises();

    (document.body.querySelector('button[aria-label="Quitar el rol Coordinador de Software"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(document.body.textContent).toContain('ANA PÉREZ deja de ser Coordinador de Software.');

    ([...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Quitar rol') as HTMLButtonElement).click();
    await flushPromises();

    expect(wrapper.emitted('saved')).toEqual([['Rol quitado']]);
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed');
    expect(document.body.textContent).toContain('ANA PÉREZ deja de ser Coordinador de Software.');
    wrapper.unmount();
  });
});
