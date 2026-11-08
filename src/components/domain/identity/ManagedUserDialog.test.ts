import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ManagedUserDialog from '@/components/domain/identity/ManagedUserDialog.vue';

const { createCareerTeacher } = vi.hoisted(() => ({ createCareerTeacher: vi.fn() }));
vi.mock('@/api/career-academics', async (importOriginal) => ({ ...await importOriginal<typeof import('@/api/career-academics')>(), createCareerTeacher }));

describe('ManagedUserDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('no solicita ni muestra una contraseña al crear la cuenta', async () => {
    const wrapper = mount(ManagedUserDialog, {
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

  it('pide nombres y apellidos del docente, los dos obligatorios', async () => {
    const wrapper = mount(ManagedUserDialog, {
      attachTo: document.body,
      props: { open: true, teacherCareer: { id: 'career-1', name: 'Software' } },
    });
    await flushPromises();

    for (const part of ['nombres', 'apellidos']) {
      const input = document.querySelector<HTMLInputElement>(`#managed-user-${part}`);
      expect(input?.getAttribute('aria-required')).toBe('true');
    }
    expect(document.querySelector('#managed-user-name')).toBeNull();

    wrapper.unmount();
  });

  it('también pide nombres y apellidos en el alta de cuentas de Administración', async () => {
    const wrapper = mount(ManagedUserDialog, { attachTo: document.body, props: { open: true } });
    await flushPromises();

    for (const part of ['nombres', 'apellidos']) {
      expect(document.querySelector<HTMLInputElement>(`#managed-user-${part}`)?.getAttribute('aria-required')).toBe('true');
    }
    expect(document.querySelector('#managed-user-name')).toBeNull();

    wrapper.unmount();
  });

  it('en Administración el rol inicial propuesto es Coordinador', async () => {
    const roles = [{ codigo: 'coordinador', nombre: 'Coordinador' }, { codigo: 'docente', nombre: 'Docente' }, { codigo: 'bibliotecario', nombre: 'Bibliotecario' }];
    const wrapper = mount(ManagedUserDialog, { attachTo: document.body, props: { open: true, roles, careers: [] } as never });
    await flushPromises();

    expect(document.querySelector('#managed-user-role')?.textContent).toContain('Coordinador');
    expect(document.querySelector('#managed-user-career')).not.toBeNull();

    wrapper.unmount();
  });

  it('revisa nombres y apellidos antes de enviar y manda los dos campos en mayúsculas', async () => {
    createCareerTeacher.mockResolvedValue({ message: 'Docente creado' });
    const wrapper = mount(ManagedUserDialog, { attachTo: document.body, props: { open: true, teacherCareer: { id: 'career-1', name: 'Software' } } });
    await flushPromises();
    const type = async (id: string, value: string) => {
      const input = document.querySelector<HTMLInputElement>(`#managed-user-${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await flushPromises();
    };
    const submit = async () => {
      document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await flushPromises();
    };

    await type('nombres', 'ana 2');
    await type('email', 'ana@ueb.edu.ec');
    await submit();
    expect(createCareerTeacher).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Los nombres solo admiten letras, espacios, apóstrofo y guion');
    expect(document.body.textContent).toContain('Los apellidos son obligatorios');

    await type('nombres', 'maría  josé');
    await type('apellidos', "de la cruz-o'neil");
    await submit();
    expect(createCareerTeacher).toHaveBeenCalledWith({ nombres: 'MARÍA JOSÉ', apellidos: "DE LA CRUZ-O'NEIL", correo_electronico: 'ana@ueb.edu.ec' });

    wrapper.unmount();
  });
});
