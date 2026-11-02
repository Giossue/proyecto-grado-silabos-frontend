import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { resetForgottenPassword } from '@/api/session';
import ResetPasswordPage from '@/pages/ResetPasswordPage.vue';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';

vi.mock('@/api/session', () => ({ resetForgottenPassword: vi.fn() }));

enableAutoUnmount(afterEach);
afterEach(() => sessionState.clear());

describe('Restablecer contraseña', () => {
  it('con una sesión abierta, al terminar la olvida y lleva a ingresar', async () => {
    sessionState.replace({
      user: { id: 'u1', name: 'Ana', email: 'ana@ueb.edu.ec', email_verified: true, can_edit_identity: false },
      active_role: null,
      available_roles: [],
    });
    vi.mocked(resetForgottenPassword).mockResolvedValue({ message: 'Contraseña restablecida' });
    const Empty = { template: '<div />' };
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: paths.passwordReset, component: ResetPasswordPage }, { path: paths.login, component: Empty }] });
    await router.push({ path: paths.passwordReset, query: { email: 'ana@ueb.edu.ec', token: 'abc' } });
    const wrapper = mount(ResetPasswordPage, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.get('#new-password').setValue('NuevaClave-2026!');
    await wrapper.get('#new-password-confirmation').setValue('NuevaClave-2026!');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sessionState.current.value).toBeNull();
    expect(router.currentRoute.value.path).toBe(paths.login);
  });
});
