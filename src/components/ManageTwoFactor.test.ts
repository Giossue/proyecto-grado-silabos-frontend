import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getTwoFactorStatus, type TwoFactorStatus } from '@/api/session';
import ManageTwoFactor from './ManageTwoFactor.vue';

vi.mock('@/api/session', () => ({
  getTwoFactorStatus: vi.fn(),
  confirmTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));

describe('ManageTwoFactor', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => vi.resetAllMocks());

  it('espera el estado conocido antes de ofrecer activar o desactivar la protección', async () => {
    let finish!: (status: TwoFactorStatus) => void;
    vi.mocked(getTwoFactorStatus).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const wrapper = mount(ManageTwoFactor);

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('button').some((button) => /Activar 2FA|Desactivar 2FA/.test(button.text()))).toBe(false);

    finish({ enabled: true, confirmation_required: false });
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Desactivar 2FA');
    expect(wrapper.text()).not.toContain('Activar 2FA');
  });

  it('no presenta una cuenta como desprotegida si falla la consulta inicial', async () => {
    vi.mocked(getTwoFactorStatus).mockRejectedValue(new ApiError('No se pudo consultar la protección.', 503));
    const wrapper = mount(ManageTwoFactor);
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('No se pudo consultar la protección.');
    expect(wrapper.findAll('button').some((button) => /Activar 2FA|Desactivar 2FA/.test(button.text()))).toBe(false);
  });
});
