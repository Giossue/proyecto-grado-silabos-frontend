import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';

afterEach(() => sessionState.clear());

describe('ProcessLockAlert', () => {
  it('muestra el mensaje único y enlaza a Convocatorias de Coordinación', () => {
    sessionState.replace({
      user: { id: 'user-1', name: 'Coordinación', email: 'coord@ueb.edu.ec', email_verified: true, must_change_password: false, can_edit_identity: false },
      active_role: { id: 'role-1', code: 'coordinador', career_id: 'career-1', career_name: 'Software' },
      available_roles: [],
    });
    const wrapper = mount(ProcessLockAlert, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Edición bloqueada');
    expect(wrapper.text()).toContain('Pause la convocatoria para editar desde Convocatorias.');
    expect(wrapper.get('a').attributes('href')).toBe(paths.coordination.convocations);
  });
});
