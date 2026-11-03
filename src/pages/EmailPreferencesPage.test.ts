import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEmailPreferences, updateEmailPreferences } from '@/api/emailPreferences';
import EmailPreferencesPage from '@/pages/EmailPreferencesPage.vue';
import { toast } from '@/lib/toast';

vi.mock('@/api/emailPreferences', () => ({ getEmailPreferences: vi.fn(), updateEmailPreferences: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/layouts/settings/Layout.vue', () => ({ default: { template: '<div><slot /></div>' } }));

enableAutoUnmount(afterEach);

const options = [
  { type: 'convocatoria.abierta', label: 'Convocatoria abierta', description: 'Tiene sílabos por elaborar', enabled: true },
  { type: 'silabo.aprobado', label: 'Sílabo aprobado', description: 'Su sílabo quedó aprobado, con el PDF listo', enabled: true },
];
const saveButton = () => [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Guardar')!;

describe('Configuración › Notificaciones', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(getEmailPreferences).mockResolvedValue({ options });
  });

  it('muestra un interruptor por aviso de su rol y guarda solo si cambió algo', async () => {
    vi.mocked(updateEmailPreferences).mockResolvedValue({ options: [options[0]!, { ...options[1]!, enabled: false }] });
    const wrapper = mount(EmailPreferencesPage, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('Convocatoria abierta');
    expect(wrapper.text()).toContain('Su sílabo quedó aprobado, con el PDF listo');
    expect(saveButton().disabled).toBe(true);

    document.body.querySelector<HTMLButtonElement>('#email-notice-silabo\\.aprobado')!.click();
    await flushPromises();
    expect(saveButton().disabled).toBe(false);
    saveButton().click();
    await flushPromises();

    expect(updateEmailPreferences).toHaveBeenCalledWith({ 'convocatoria.abierta': true, 'silabo.aprobado': false });
    expect(toast.success).toHaveBeenCalledWith('Avisos por correo guardados');
    expect(saveButton().disabled).toBe(true);
  });

  it('si su rol no recibe correos, lo dice y no ofrece guardar', async () => {
    vi.mocked(getEmailPreferences).mockResolvedValue({ options: [] });
    const wrapper = mount(EmailPreferencesPage, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('Su rol no recibe avisos por correo');
    expect(saveButton()).toBeUndefined();
  });
});
