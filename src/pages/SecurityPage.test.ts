import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getTwoFactorStatus, requestPasswordRecovery, type Session } from '@/api/session';
import SecurityPage from '@/pages/SecurityPage.vue';
import { sessionState } from '@/state/session';

vi.mock('@/api/session', () => ({
  getTwoFactorStatus: vi.fn(),
  updatePassword: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  confirmTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));
vi.mock('@/layouts/settings/Layout.vue', () => ({ default: { template: '<div><slot /></div>' } }));

const session: Session = {
  user: { id: 'u1', name: 'Ana', email: 'ana@ueb.edu.ec', email_verified: true, can_edit_identity: false },
  active_role: { id: 'r1', code: 'docente', career_id: 'c1', career_name: 'Software' },
  available_roles: [],
};
const sendButton = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').find((button) => button.text().includes('Enviar enlace'))!;

describe('Seguridad: restablecer la contraseña por correo', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    sessionState.replace(session);
    vi.mocked(getTwoFactorStatus).mockResolvedValue({ enabled: false, confirmed: false, qr_code_svg: null, setup_key: null, recovery_codes_count: 0 } as never);
  });
  afterEach(() => sessionState.clear());

  it('envía el enlace al correo de la cuenta y avisa que se cerrará la sesión en todos lados', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue({ message: 'ok' });
    const wrapper = mount(SecurityPage);
    await flushPromises();

    expect(wrapper.text()).toContain('ana@ueb.edu.ec');
    expect(wrapper.text()).toContain('se cerrará la sesión en todos los dispositivos');
    await sendButton(wrapper).trigger('click');
    await flushPromises();

    expect(requestPasswordRecovery).toHaveBeenCalledWith('ana@ueb.edu.ec');
    expect(wrapper.text()).toContain('Enlace enviado');
  });

  it('muestra el error si no se pudo enviar', async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValue(new ApiError('Demasiados intentos', 429, {}));
    const wrapper = mount(SecurityPage);
    await flushPromises();

    await sendButton(wrapper).trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Demasiados intentos');
  });
});
