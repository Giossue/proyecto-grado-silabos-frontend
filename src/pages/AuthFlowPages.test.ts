import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage.vue';
import TwoFactorChallengePage from '@/pages/TwoFactorChallengePage.vue';
import { completeTwoFactorLogin, getSession, login } from '@/api/session';
import { sessionState } from '@/state/session';

const { replace, route } = vi.hoisted(() => ({
  replace: vi.fn(),
  route: { query: {} },
}));

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
}));
vi.mock('@/api/session', () => ({
  login: vi.fn(),
  completeTwoFactorLogin: vi.fn(),
  getSession: vi.fn(),
}));

const authenticatedSession = {
  user: {
    id: 'user-1',
    name: 'Docente',
    email: 'docente@example.test',
    email_verified: true,
    can_edit_identity: false,
  },
  active_role: { id: 'role-1', code: 'docente' as const, career_id: 'career-1', career_name: 'Software' },
  available_roles: [],
};

describe('authentication pages', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(login).mockReset();
    vi.mocked(completeTwoFactorLogin).mockReset();
    vi.mocked(getSession).mockReset();
    sessionState.clear();
  });


  it('replaces a cached guest state after logging in again in the same tab', async () => {
    vi.mocked(login).mockResolvedValue(authenticatedSession);
    const wrapper = mount(LoginPage, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });

    await wrapper.get('input[type="email"]').setValue('docente@example.test');
    await wrapper.get('input[type="password"]').setValue('secret');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sessionState.current.value).toEqual(authenticatedSession);
    expect(replace).toHaveBeenCalledWith('/dashboard');
    wrapper.unmount();
  });

  it('reloads the authenticated session after completing the second factor', async () => {
    vi.mocked(completeTwoFactorLogin).mockResolvedValue({ message: 'ok' });
    vi.mocked(getSession).mockResolvedValue(authenticatedSession);
    const wrapper = mount(TwoFactorChallengePage, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });

    await wrapper.get('input[inputmode="numeric"]').setValue('123456');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(getSession).toHaveBeenCalledOnce();
    expect(sessionState.current.value).toEqual(authenticatedSession);
    expect(replace).toHaveBeenCalledWith('/dashboard');
    wrapper.unmount();
  });
});
