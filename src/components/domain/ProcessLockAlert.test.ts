import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';

enableAutoUnmount(afterEach);
afterEach(() => sessionState.clear());

const signIn = (code: 'administrador' | 'coordinador') => sessionState.replace({
  user: { id: 'user-1', name: 'Usuario', email: 'u@ueb.edu.ec', email_verified: true, can_edit_identity: false },
  active_role: { id: 'role-1', code, career_id: code === 'coordinador' ? 'career-1' : null, career_name: code === 'coordinador' ? 'Software' : null },
  available_roles: [],
});
const stubs = { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } };

describe('ProcessLockAlert', () => {
  it('nombra la convocatoria y envía a Coordinación a sus convocatorias', () => {
    signIn('coordinador');
    const wrapper = mount(ProcessLockAlert, {
      props: { lock: { scope: 'convocation', period: '2026-I', institutional_pause: false, delivery_on: '2026-10-30' } },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Edición bloqueada · Convocatoria 2026-I');
    expect(wrapper.text()).toContain('Pause la convocatoria de su carrera para editar.');
    expect(wrapper.get('a').text()).toBe('Ir a Convocatorias');
    expect(wrapper.get('a').attributes('href')).toBe(paths.coordination.panel);
  });

  it('a Administración le habla del proceso y la envía a Convocatorias', () => {
    signIn('administrador');
    const wrapper = mount(ProcessLockAlert, {
      props: { lock: { scope: 'process', period: '2026-I', institutional_pause: false, delivery_on: null } },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Pause el proceso para editar.');
    expect(wrapper.get('a').attributes('href')).toBe(paths.admin.convocations);
  });

  it('explica el motivo en un detalle y avisa si la pausa institucional no basta', async () => {
    signIn('coordinador');
    const wrapper = mount(ProcessLockAlert, {
      attachTo: document.body,
      props: { lock: { scope: 'convocation', period: '2026-I', institutional_pause: true, delivery_on: '2026-10-30' } },
      global: { stubs },
    });
    await wrapper.findAll('button').find((button) => button.text() === '¿Por qué?')!.trigger('click');

    expect(document.body.textContent).toContain('Administración pausó la convocatoria institucional, pero la de su carrera sigue abierta');
    expect(document.body.textContent).toContain('se rehacen');
  });

  it('sirve también para avisos propios sin acción ni detalle', () => {
    const wrapper = mount(ProcessLockAlert, { props: { title: 'Edición no disponible', message: 'La convocatoria está en pausa.', hideAction: true }, global: { stubs } });

    expect(wrapper.text()).toContain('Edición no disponible');
    expect(wrapper.text()).toContain('La convocatoria está en pausa.');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('¿Por qué?');
  });

  it('mantiene el mensaje genérico cuando el servidor no envía el detalle', () => {
    signIn('coordinador');
    const wrapper = mount(ProcessLockAlert, { global: { stubs } });

    expect(wrapper.text()).toContain('Edición bloqueada');
    expect(wrapper.text()).not.toContain('¿Por qué?');
  });
});
