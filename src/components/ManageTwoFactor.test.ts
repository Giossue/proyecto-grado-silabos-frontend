import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { disableTwoFactor, enableTwoFactor, getTwoFactorStatus, type TwoFactorStatus } from '@/api/session';
import ManageTwoFactor from './ManageTwoFactor.vue';

vi.mock('@/api/session', () => ({
  getTwoFactorStatus: vi.fn(),
  confirmTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement('style');
  style.dataset.exit = '';
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};

describe('ManageTwoFactor', () => {
  afterEach(() => document.head.querySelectorAll('style[data-exit]').forEach((style) => style.remove()));
  enableAutoUnmount(afterEach);
  beforeEach(() => vi.resetAllMocks());

  it('espera el estado conocido antes de ofrecer activar o desactivar la protección', async () => {
    let finish!: (status: TwoFactorStatus) => void;
    vi.mocked(getTwoFactorStatus).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const wrapper = mount(ManageTwoFactor);

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true');
    expect(wrapper.emitted('loading')).toEqual([[true]]);
    expect(wrapper.findAll('button').some((button) => /Activar 2FA|Desactivar 2FA/.test(button.text()))).toBe(false);

    finish({ enabled: true, confirmation_required: false });
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.emitted('loading')).toEqual([[true], [false]]);
    expect(wrapper.text()).toContain('Desactivar 2FA');
    expect(wrapper.text()).not.toContain('Activar 2FA');
  });

  it('no presenta una cuenta como desprotegida si falla la consulta inicial', async () => {
    vi.mocked(getTwoFactorStatus).mockRejectedValue(new ApiError('No se pudo consultar la protección', 503));
    const wrapper = mount(ManageTwoFactor);
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.emitted('loading')).toEqual([[true], [false]]);
    expect(wrapper.text()).toContain('No se pudo consultar la protección');
    expect(wrapper.findAll('button').some((button) => /Activar 2FA|Desactivar 2FA/.test(button.text()))).toBe(false);
  });

  const openDisable = async (): Promise<ReturnType<typeof mount>> => {
    vi.mocked(getTwoFactorStatus).mockResolvedValue({ enabled: true, confirmation_required: false });
    const wrapper = mount(ManageTwoFactor, { attachTo: document.body });
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text().includes('Desactivar 2FA'))!.trigger('click');
    await flushPromises();
    return wrapper;
  };
  const type = async (selector: string, value: string): Promise<void> => {
    const input = document.body.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await flushPromises();
  };
  const submitButton = (): HTMLButtonElement => document.body.querySelector('form button[type="submit"]') as HTMLButtonElement;

  it('pide la contraseña actual y el código del autenticador antes de desactivar el segundo factor', async () => {
    vi.mocked(disableTwoFactor).mockResolvedValue({ enabled: false, confirmation_required: false });
    await openDisable();
    expect(disableTwoFactor).not.toHaveBeenCalled();

    await type('#disable-current-password', 'clave-actual');
    expect(submitButton().disabled).toBe(true);
    await type('#disable-code', '123456');
    submitButton().click();
    await flushPromises();

    expect(disableTwoFactor).toHaveBeenCalledWith('clave-actual', '123456');
  });

  it('permite desactivar con un código de recuperación', async () => {
    vi.mocked(disableTwoFactor).mockResolvedValue({ enabled: false, confirmation_required: false });
    await openDisable();

    (Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent?.includes('Usar un código de recuperación')) as HTMLButtonElement).click();
    await flushPromises();
    expect(document.body.textContent).toContain('Código de recuperación');
    await type('#disable-current-password', 'clave-actual');
    await type('#disable-code', 'ABCD-EFGH');
    submitButton().click();
    await flushPromises();

    expect(disableTwoFactor).toHaveBeenCalledWith('clave-actual', '', 'ABCD-EFGH');
  });

  it('si el código no es válido, el diálogo sigue abierto con el mensaje y la protección sigue activa', async () => {
    vi.mocked(disableTwoFactor).mockRejectedValue(new ApiError('El código de autenticación no es válido.', 422, { code: ['El código de autenticación no es válido.'] }));
    const wrapper = await openDisable();
    await type('#disable-current-password', 'clave-actual');
    await type('#disable-code', '000000');
    submitButton().click();
    await flushPromises();

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.dataset.state).toBe('open');
    expect(dialog.textContent).toContain('El código de autenticación no es válido');
    expect(wrapper.text()).toContain('Desactivar 2FA');
  });

  it('al confirmar, el diálogo se desvanece como diálogo de desactivar', async () => {
    simulateExitAnimation();
    vi.mocked(disableTwoFactor).mockResolvedValue({ enabled: false, confirmation_required: false });
    await openDisable();
    await type('#disable-current-password', 'clave-actual');
    await type('#disable-code', '123456');

    submitButton().click();
    await flushPromises();

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.dataset.state).toBe('closed');
    expect(dialog.textContent).toContain('Desactivar la verificación en dos pasos');
    expect(dialog.querySelector('button[type="submit"]')!.textContent?.trim()).toBe('Desactivar 2FA');
  });

  it('activar sigue pidiendo solo la contraseña actual', async () => {
    vi.mocked(getTwoFactorStatus).mockResolvedValue({ enabled: false, confirmation_required: false });
    vi.mocked(enableTwoFactor).mockResolvedValue({ enabled: false, confirmation_required: true, qr_code_svg: '<svg></svg>' });
    const wrapper = mount(ManageTwoFactor, { attachTo: document.body });
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text().includes('Activar 2FA'))!.trigger('click');
    await flushPromises();

    await type('#confirm-current-password', 'clave-actual');
    submitButton().click();
    await flushPromises();

    expect(enableTwoFactor).toHaveBeenCalledWith('clave-actual');
  });
});
