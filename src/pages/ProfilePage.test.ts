import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateFormation } from '@/api/session';
import ProfilePage from '@/pages/ProfilePage.vue';
import { sessionState } from '@/state/session';

vi.mock('@/api/session', () => ({
  updateProfile: vi.fn(),
  updateFormation: vi.fn(),
  resendEmailVerification: vi.fn(),
}));

const layout = defineComponent({ template: '<div><slot /></div>' });
const sessionFor = (code: 'docente' | 'administrador', formation: string | null = null) => ({
  user: { id: 'u-1', name: 'DOCENTE UNO', email: 'docente@ueb.edu.ec', email_verified: true, can_edit_identity: code === 'administrador', formation },
  active_role: { id: 'r-1', code, career_id: null, career_name: null },
  available_roles: [],
});
const mountPage = () => mount(ProfilePage, { global: { stubs: { SettingsLayout: layout, RouterLink: { template: '<a><slot /></a>' } } } });

describe('ProfilePage — formación y experiencia del docente', () => {
  beforeEach(() => {
    vi.mocked(updateFormation).mockReset();
    sessionState.clear();
  });

  it('el docente escribe su formación una vez y el botón espera un cambio', async () => {
    sessionState.replace(sessionFor('docente'));
    vi.mocked(updateFormation).mockResolvedValue(sessionFor('docente', 'Ingeniero en Sistemas'));
    const wrapper = mountPage();
    const save = wrapper.get('[data-test="update-formation-button"]');
    expect(save.attributes('disabled')).toBeDefined();

    await wrapper.get('#formation').setValue('Ingeniero en Sistemas');
    expect(save.attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(updateFormation).toHaveBeenCalledWith('Ingeniero en Sistemas');
    expect(sessionState.current.value?.user.formation).toBe('Ingeniero en Sistemas');
  });

  it('otros roles no ven el campo', () => {
    sessionState.replace(sessionFor('administrador'));
    const wrapper = mountPage();

    expect(wrapper.find('#formation').exists()).toBe(false);
  });
});
