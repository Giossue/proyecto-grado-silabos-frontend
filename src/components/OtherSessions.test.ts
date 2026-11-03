import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { closeOtherDeviceSessions, getDeviceSessions, type DeviceSession } from '@/api/session';
import OtherSessions from '@/components/OtherSessions.vue';
import { toast } from '@/lib/toast';

vi.mock('@/api/session', () => ({ getDeviceSessions: vi.fn(), closeOtherDeviceSessions: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

enableAutoUnmount(afterEach);

const current: DeviceSession = { id: 's1', ip_address: '10.0.0.1', device: 'Firefox en Linux', last_activity: '2026-11-03T15:00:00Z', current: true };
const phone: DeviceSession = { id: 's2', ip_address: '10.0.0.2', device: 'Chrome en Android', last_activity: '2026-11-02T13:30:00Z', current: false };
const button = (label: string): HTMLButtonElement | undefined => [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.trim() === label);

describe('sesiones abiertas en Seguridad', () => {
    beforeEach(() => { vi.resetAllMocks(); document.body.innerHTML = ''; });

    it('lista los dispositivos, marca el actual y, sin otros, no ofrece cerrarlos', async () => {
        vi.mocked(getDeviceSessions).mockResolvedValue({ sessions: [current] });
        const wrapper = mount(OtherSessions, { attachTo: document.body });
        await flushPromises();

        expect(wrapper.text()).toContain('Firefox en Linux');
        expect(wrapper.text()).toContain('Este dispositivo');
        expect(button('Cerrar otras sesiones')).toBeUndefined();
    });

    it('cierra las otras sesiones con la contraseña y vuelve a cargar la lista', async () => {
        vi.mocked(getDeviceSessions).mockResolvedValueOnce({ sessions: [current, phone] }).mockResolvedValueOnce({ sessions: [current] });
        vi.mocked(closeOtherDeviceSessions).mockResolvedValue({ message: 'Se cerró una sesión adicional.', closed_sessions: 1 });
        const wrapper = mount(OtherSessions, { attachTo: document.body });
        await flushPromises();
        expect(wrapper.text()).toContain('Chrome en Android');

        button('Cerrar otras sesiones')!.click();
        await flushPromises();
        const input = document.body.querySelector<HTMLInputElement>('#other-sessions-password')!;
        input.value = 'Demo-2026!';
        input.dispatchEvent(new Event('input'));
        await flushPromises();
        document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
        await flushPromises();

        expect(closeOtherDeviceSessions).toHaveBeenCalledWith('Demo-2026!');
        expect(toast.success).toHaveBeenCalledWith('Se cerró una sesión adicional.');
        await vi.waitFor(() => expect(wrapper.text()).not.toContain('Chrome en Android'));
    });

    it('con la contraseña incorrecta muestra el error dentro del diálogo y no cierra nada', async () => {
        vi.mocked(getDeviceSessions).mockResolvedValue({ sessions: [current, phone] });
        vi.mocked(closeOtherDeviceSessions).mockRejectedValue(new ApiError('Datos inválidos', 422, { current_password: ['La contraseña no es correcta.'] }));
        mount(OtherSessions, { attachTo: document.body });
        await flushPromises();

        button('Cerrar otras sesiones')!.click();
        await flushPromises();
        const input = document.body.querySelector<HTMLInputElement>('#other-sessions-password')!;
        input.value = 'mala';
        input.dispatchEvent(new Event('input'));
        await flushPromises();
        document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
        await flushPromises();

        expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('La contraseña no es correcta');
        expect(toast.success).not.toHaveBeenCalled();
    });
});
