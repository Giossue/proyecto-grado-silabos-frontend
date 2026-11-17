import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '@/pages/ProfilePage.vue';
import { sessionState } from '@/state/session';

vi.mock('@/api/session', () => ({
  updateProfile: vi.fn(),
  resendActivation: vi.fn(),
}));

const layout = defineComponent({ template: '<div><slot /></div>' });

describe('ProfilePage — datos de la cuenta', () => {
  beforeEach(() => sessionState.clear());

  it('el docente ve solo los datos de la cuenta: la formación vive en su pestaña «Perfil docente»', () => {
    sessionState.replace({
      user: { id: 'u-1', name: 'DOCENTE UNO', email: 'docente@ueb.edu.ec', email_verified: true, can_edit_identity: false, formation: 'Ingeniero en Sistemas' },
      active_role: { id: 'r-1', code: 'docente', career_id: null, career_name: null },
      available_roles: [],
    });
    const wrapper = mount(ProfilePage, { global: { stubs: { SettingsLayout: layout, RouterLink: { template: '<a><slot /></a>' } } } });

    expect(wrapper.text()).toContain('Datos de la cuenta');
    expect(wrapper.find('#formation').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Formación y experiencia');
  });
});
