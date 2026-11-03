import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getSystemSettings, testSystemConnection, updateSystemSettings, type SystemSettings } from '@/api/systemSettings';
import AdminSystemSettingsPage from '@/pages/AdminSystemSettingsPage.vue';
import { toast } from '@/lib/toast';

vi.mock('@/api/systemSettings', () => ({ getSystemSettings: vi.fn(), updateSystemSettings: vi.fn(), testSystemConnection: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/layouts/settings/Layout.vue', () => ({ default: { template: '<div><slot /></div>' } }));

enableAutoUnmount(afterEach);

const settings = (): SystemSettings => ({
  notifications: { emails: { value: true, source: 'entorno' }, digest_time: { value: '08:00', source: 'entorno' } },
  ai: {
    driver: { value: 'deepseek', source: 'entorno' },
    base_url: { value: 'https://api.deepseek.com', source: 'entorno' },
    model: { value: 'deepseek-chat', source: 'entorno' },
    api_key: { configured: true, source: 'entorno' },
    connect_timeout: { value: 2, source: 'entorno' },
    timeout: { value: 50, source: 'entorno' },
  },
  library: { driver: { value: 'koha', source: 'pantalla' }, base_url: { value: 'http://biblioteca.ueb.edu.ec', source: 'pantalla' } },
});
const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>('button')].filter((item) => item.textContent?.trim() === text);
const openSection = async (title: string): Promise<void> => {
  [...document.body.querySelectorAll<HTMLButtonElement>('[data-slot="accordion-trigger"]')].find((item) => item.textContent?.includes(title))!.click();
  await flushPromises();
};
// Los campos avisan el cambio en el siguiente ciclo: hay que esperarlo antes de guardar.
const setInput = async (id: string, value: string): Promise<void> => {
  const input = document.body.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement('style');
  style.dataset.exit = '';
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};

describe('Configuración › Sistema', () => {
  afterEach(() => document.head.querySelectorAll('style[data-exit]').forEach((style) => style.remove()));
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(getSystemSettings).mockResolvedValue(settings());
    vi.mocked(updateSystemSettings).mockResolvedValue(settings());
  });

  it('no muestra la clave ni parte de ella, ni de dónde sale cada ajuste', async () => {
    const wrapper = mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();
    await openSection('Asistente de IA');

    expect(wrapper.text()).not.toContain('Clave guardada');
    expect(document.body.querySelector<HTMLInputElement>('#settings-ai-key')!.placeholder).toBe('Escriba una clave nueva solo para cambiarla');
    expect(document.body.querySelector('button[aria-label="Mostrar contraseña"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label="Quitar la clave"]')).not.toBeNull();
    expect(wrapper.text()).not.toContain('variable de entorno');
    expect(document.body.querySelector<HTMLInputElement>('#settings-ai-key')!.value).toBe('');
  });

  it('muestra cada opción en su acordeón, con Notificaciones abierta al entrar', async () => {
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();

    expect([...document.body.querySelectorAll('[data-slot="accordion-trigger"]')].map((item) => item.textContent?.trim().split(/Avisos|Proveedor|Catálogo/)[0])).toEqual(['Notificaciones', 'Asistente de IA', 'Biblioteca (Koha)']);
    expect(document.body.querySelector('#settings-digest-time')).not.toBeNull();
    expect(document.body.querySelector('#settings-ai-driver')).toBeNull();
    await openSection('Asistente de IA');
    expect(document.body.querySelector('#settings-ai-driver')).not.toBeNull();
    expect(document.body.querySelector('#settings-digest-time')).toBeNull();
  });

  it('«Guardar» se activa solo con cambios y las notificaciones se guardan sin contraseña', async () => {
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();
    expect(button('Guardar')[0]!.disabled).toBe(true);
    await setInput('settings-digest-time', '07:30');
    button('Guardar')[0]!.click();
    await flushPromises();

    expect(updateSystemSettings).toHaveBeenCalledWith('notificaciones', { emails: true, digest_time: '07:30' });
    expect(toast.success).toHaveBeenCalledWith('Ajustes guardados');
  });

  it('la IA pide la contraseña y solo manda la clave si se escribió una nueva', async () => {
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();
    await openSection('Asistente de IA');
    expect(button('Guardar')[0]!.disabled).toBe(true);
    await setInput('settings-ai-model', 'deepseek-flash');

    button('Guardar')[0]!.click();
    await flushPromises();
    expect(updateSystemSettings).not.toHaveBeenCalled();
    await setInput('confirm-current-password', 'Demo-2026!');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.not.objectContaining({ api_key: expect.anything() }));
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.objectContaining({ current_password: 'Demo-2026!', driver: 'deepseek', model: 'deepseek-flash' }));

    await setInput('settings-ai-key', 'sk-nueva-11112222');
    button('Guardar')[0]!.click();
    await flushPromises();
    await setInput('confirm-current-password', 'Demo-2026!');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(updateSystemSettings).toHaveBeenLastCalledWith('ia', expect.objectContaining({ api_key: 'sk-nueva-11112222' }));

    document.body.querySelector<HTMLButtonElement>('button[aria-label="Quitar la clave"]')!.click();
    await flushPromises();
    button('Guardar')[0]!.click();
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

    await openSection('Biblioteca');
    button('Probar conexión')[0]!.click();
    await flushPromises();
    expect(testSystemConnection).toHaveBeenCalledWith('biblioteca');
    expect(toast.success).toHaveBeenCalledWith('Conexión correcta: 3 bibliotecas');

    await openSection('Asistente de IA');
    button('Probar conexión')[0]!.click();
    await flushPromises();
    expect(toast.error).toHaveBeenCalledWith('El proveedor no aceptó la clave');
  });

  it('al cerrar la confirmación conserva su título y su aviso, y al abrirla de nuevo el aviso vuelve a empezar', async () => {
    simulateExitAnimation();
    vi.mocked(updateSystemSettings).mockRejectedValueOnce(new ApiError('Datos inválidos', 422, { current_password: ['La contraseña no es correcta'] }));
    mount(AdminSystemSettingsPage, { attachTo: document.body });
    await flushPromises();
    await openSection('Asistente de IA');
    await setInput('settings-ai-model', 'deepseek-flash');
    button('Guardar')[0]!.click();
    await flushPromises();
    await setInput('confirm-current-password', 'mala');
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    const dialog = (): HTMLElement => document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    await vi.waitFor(() => expect(dialog().textContent).toContain('La contraseña no es correcta'));

    button('Cancelar')[0]!.click();
    await vi.waitFor(() => expect(dialog().dataset.state).toBe('closed'));
    expect(dialog().textContent).toContain('Guardar el asistente de IA');
    expect(dialog().textContent).toContain('La contraseña no es correcta');

    button('Guardar')[0]!.click();
    await vi.waitFor(() => expect(dialog().dataset.state).toBe('open'));
    expect(dialog().textContent).toContain('Por seguridad, confirme su contraseña actual para guardar');
  });
});
