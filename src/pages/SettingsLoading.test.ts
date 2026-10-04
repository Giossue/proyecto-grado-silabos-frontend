import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getTwoFactorStatus, type Session, type TwoFactorStatus } from '@/api/session';
import ProfilePage from '@/pages/ProfilePage.vue';
import SecurityPage from '@/pages/SecurityPage.vue';
import { sessionState } from '@/state/session';

vi.mock('@/api/session', () => ({
    getTwoFactorStatus: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn(),
    resendEmailVerification: vi.fn(),
    confirmTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    enableTwoFactor: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
}));

vi.mock('@/layouts/settings/Layout.vue', () => ({
    default: { template: '<div><slot /></div>' },
}));

const session: Session = {
    user: { id: 'user-test', name: 'PERSONA DE PRUEBA', email: 'persona@example.test', email_verified: true, can_edit_identity: false },
    active_role: { id: 'role-test', code: 'docente', career_id: 'career-test', career_name: 'Software' },
    available_roles: [],
};

describe('carga de Configuración', () => {
    enableAutoUnmount(afterEach);
    beforeEach(() => {
        vi.resetAllMocks();
        sessionState.replace(session);
    });
    afterEach(() => sessionState.clear());

    it('espera una única consulta de seguridad antes de revelar el formulario y segundo factor', async () => {
        let finish!: (status: TwoFactorStatus) => void;
        vi.mocked(getTwoFactorStatus).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
        const wrapper = mount(SecurityPage);

        expect(wrapper.get('[data-settings-section="security"]').isVisible()).toBe(true);
        expect(wrapper.get('#current_password').isVisible()).toBe(false);
        expect(wrapper.get('[data-test="update-password-button"]').isVisible()).toBe(false);
        expect(getTwoFactorStatus).toHaveBeenCalledTimes(1);

        finish({ enabled: false, confirmation_required: false });
        await flushPromises();

        expect(wrapper.find('[data-settings-section="security"]').exists()).toBe(false);
        expect(wrapper.get('#current_password').isVisible()).toBe(true);
        expect(wrapper.findAll('button').find((button) => button.text() === 'Activar 2FA')?.isVisible()).toBe(true);
        expect(getTwoFactorStatus).toHaveBeenCalledTimes(1);
    });

    it('libera el formulario de contraseña cuando falla el segundo factor sin inventar su estado', async () => {
        vi.mocked(getTwoFactorStatus).mockRejectedValue(new ApiError('No se pudo consultar la protección.', 503));
        const wrapper = mount(SecurityPage);
        await flushPromises();

        expect(wrapper.find('[data-settings-section="security"]').exists()).toBe(false);
        expect(wrapper.get('#current_password').isVisible()).toBe(true);
        expect(wrapper.text()).toContain('No se pudo consultar la protección.');
        expect(wrapper.findAll('button').some((button) => /Activar 2FA|Desactivar 2FA/.test(button.text()))).toBe(false);
    });

    it('carga Perfil hasta tener la identidad y conserva la consulta de un docente', async () => {
        sessionState.clear();
        const wrapper = mount(ProfilePage);

        expect(wrapper.get('[data-settings-section="profile"]').isVisible()).toBe(true);
        expect(wrapper.find('input').exists()).toBe(false);

        sessionState.replace(session);
        await flushPromises();

        expect(wrapper.find('[data-settings-section="profile"]').exists()).toBe(false);
        expect(wrapper.get<HTMLInputElement>('#readonly-name').element.value).toBe(session.user.name);
        expect(wrapper.get('#readonly-name').attributes('disabled')).toBeDefined();
        expect(wrapper.find('[data-test="update-profile-button"]').exists()).toBe(false);
    });

    it('presenta directamente el perfil editable cuando su sesión ya está disponible', () => {
        sessionState.replace({ ...session, user: { ...session.user, can_edit_identity: true }, active_role: { ...session.active_role!, code: 'administrador', career_id: null, career_name: null } });
        const wrapper = mount(ProfilePage);

        expect(wrapper.find('[data-settings-section="profile"]').exists()).toBe(false);
        expect(wrapper.get<HTMLInputElement>('#name').element.value).toBe(session.user.name);
        expect(wrapper.find('[data-test="update-profile-button"]').exists()).toBe(true);
    });
});
