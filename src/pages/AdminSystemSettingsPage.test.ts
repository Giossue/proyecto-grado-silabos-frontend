import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSystemSettings, testSystemConnection, updateSystemSettings, type SystemSettings } from '@/api/systemSettings';
import AdminSystemSettingsPage from '@/pages/AdminSystemSettingsPage.vue';
import { toast } from '@/lib/toast';

vi.mock('@/api/systemSettings', () => ({ getSystemSettings: vi.fn(), updateSystemSettings: vi.fn(), testSystemConnection: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/layouts/settings/Layout.vue', () => ({ default: { template: '<div><slot /></div>' } }));

enableAutoUnmount(afterEach);

const settings = (): SystemSettings => ({
  notifications: { emails: { value: true, source: 'entorno' }, digest: { value: true, source: 'entorno' }, digest_time: { value: '08:00', source: 'entorno' } },
  ai: {
    driver: { value: 'deepseek', source: 'entorno' },
    base_url: { value: 'https://api.deepseek.com', source: 'entorno' },
    model: { value: 'deepseek-chat', source: 'entorno' },
    api_key: { configured: true, last4: '4c2e', source: 'entorno' },
    connect_timeout: { value: 2, source: 'entorno' },
    timeout: { value: 50, source: 'entorno' },
  },
  library: { driver: { value: 'koha', source: 'pantalla' }, base_url: { value: 'http://biblioteca.ueb.edu.ec', source: 'pantalla' } },
});
const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>('button')].filter((item) => item.textContent?.trim() === text);
// Los campos avisan el cambio en el siguiente ciclo: hay que esperarlo antes de guardar.
const setInput = async (id: string, value: string): Promise<void> => {
  const input = document.body.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};

describe('Configuración › Sistema', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(getSystemSettings).mockResolvedValue(settings());
    vi.mocked(updateSystemSettings).mockResolvedValue(settings());
  });

  it('muestra la clave solo por sus últimos 4 caracteres, sin decir de dónde sale cada ajuste', async () => {
    const wrapper = mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('Clave guardada · termina en …4c2e');
    expect(wrapper.text()).not.toContain('variable de entorno');
    expect(document.body.querySelector<HTMLInputElement>('#settings-ai-key')!.value).toBe('');
  });

  it('guarda las notificaciones sin pedir contraseña', async () => {
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();
    await setInput('settings-digest-time', '07:30');
    button('Guardar')[0]!.click();
    await flushPromises();

    expect(updateSystemSettings).toHaveBeenCalledWith('notificaciones', { emails: true, digest: true, digest_time: '07:30' });
    expect(toast.success).toHaveBeenCalledWith('Ajustes guardados');
  });

  it('la IA pide la contraseña y solo manda la clave si se escribió una nueva', async () => {
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();

    button('Guardar')[1]!.click();
    await flushPromises();
    expect(updateSystemSettings).not.toHaveBeenCalled();
    await setInput('confirm-current-password', 'Demo-2026!');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.not.objectContaining({ api_key: expect.anything() }));
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.objectContaining({ current_password: 'Demo-2026!', driver: 'deepseek' }));

    await setInput('settings-ai-key', 'sk-nueva-11112222');
    button('Guardar')[1]!.click();
    await flushPromises();
    await setInput('confirm-current-password', 'Demo-2026!');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.objectContaining({ api_key: 'sk-nueva-11112222' }));

    button('Quitar la clave')[0]!.click();
    await flushPromises();
    button('Guardar')[1]!.click();
    await flushPromises();
    await setInput('confirm-current-password', 'Demo-2026!');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.objectContaining({ clear_api_key: true }));
  });

  it('«Probar conexión» avisa el resultado', async () => {
    vi.mocked(testSystemConnection).mockResolvedValueOnce({ ok: true, message: 'Conexión correcta: 3 bibliotecas' }).mockResolvedValueOnce({ ok: false, message: 'El proveedor no aceptó la clave' });
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();

    button('Probar conexión')[1]!.click();
    await flushPromises();
    expect(testSystemConnection).toHaveBeenCalledWith('biblioteca');
    expect(toast.success).toHaveBeenCalledWith('Conexión correcta: 3 bibliotecas');

    button('Probar conexión')[0]!.click();
    await flushPromises();
    expect(toast.error).toHaveBeenCalledWith('El proveedor no aceptó la clave');
  });
});
