import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InstallAppDialog from '@/components/InstallAppDialog.vue';
import { initializeInstallApp, installAppState } from '@/state/installApp';

vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn() } }));

const mountDialog = () => mount(InstallAppDialog, { props: { open: true }, attachTo: document.body });

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement('style');
  style.dataset.exit = '';
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};

describe('InstallAppDialog', () => {
  afterEach(() => { document.body.innerHTML = ''; document.head.querySelectorAll('style[data-exit]').forEach((style) => style.remove()); });

  it('sin aviso del navegador explica cómo instalar en Chrome, Edge o Safari de Mac', async () => {
    const wrapper = mountDialog();
    await flushPromises();

    expect(document.body.textContent).toContain('Instalar Sílabos UEB');
    expect(document.body.textContent).toContain('Chrome o Edge: menú ⋮ → «Instalar»');
    expect(Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.trim() === 'Instalar')).toBe(false);
    wrapper.unmount();
  });

  it('con el aviso del navegador ofrece el botón Instalar y lo abre', async () => {
    initializeInstallApp();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }) });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    const wrapper = mountDialog();
    await flushPromises();
    const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Instalar')!;
    button.click();
    await flushPromises();

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(installAppState.installed.value).toBe(true);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
    wrapper.unmount();
  });

  it('en iPhone explica Compartir → Agregar a pantalla de inicio', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const wrapper = mountDialog();
    await flushPromises();

    expect(document.body.textContent).toContain('Elija «Agregar a pantalla de inicio»');
    wrapper.unmount();
  });

  it('al instalar se cierra con el botón Instalar a la vista, sin pasar a las instrucciones', async () => {
    simulateExitAnimation();
    initializeInstallApp();
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome: 'accepted' as const }) });
    window.dispatchEvent(event);
    const wrapper = mountDialog();
    await flushPromises();

    Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Instalar')!.click();
    await flushPromises();
    await wrapper.setProps({ open: false });
    await flushPromises();

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.dataset.state).toBe('closed');
    expect(Array.from(dialog.querySelectorAll('button')).some((item) => item.textContent?.trim() === 'Instalar')).toBe(true);
    expect(dialog.textContent).not.toContain('Chrome o Edge');
    wrapper.unmount();
  });
});
