import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteScreenHelp } from '@/api/screen-help';
import ScreenHelpEditSheet from '@/components/domain/identity/ScreenHelpEditSheet.vue';

vi.mock('@/api/screen-help', () => ({ saveScreenHelp: vi.fn(), deleteScreenHelp: vi.fn().mockResolvedValue(undefined) }));

enableAutoUnmount(afterEach);

const screen = { key: '/admin/panel', label: 'Panel', role: 'administrador' as const, roleLabel: 'Administrador' };
const help = { screen: '/admin/panel', title: 'Panel de administración', content: 'Texto', active: true, updated_at: '2026-10-10T00:00:00Z' };

describe('ScreenHelpEditSheet', () => {
  it('muestra el rol en un campo, quita la X y elimina con confirmación desde el icono rojo', async () => {
    mount(ScreenHelpEditSheet, { attachTo: document.body, props: { screen, help, open: true } });
    await flushPromises();

    expect(document.body.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    const role = document.body.querySelector('#screen-help-role') as HTMLInputElement;
    expect(role.value).toBe('Administrador');
    expect(document.body.textContent).toContain('Rol que la verá');
    expect(document.body.textContent).not.toContain('Eliminar ayuda ');
    expect([...document.body.querySelectorAll('button')].some((button) => button.textContent?.includes('Cerrar'))).toBe(false);

    (document.body.querySelector('button[aria-label="Eliminar ayuda"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(deleteScreenHelp).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('La pantalla dejará de mostrar el botón de ayuda');

    const confirm = [...document.body.querySelectorAll('button')].filter((button) => button.textContent?.trim() === 'Eliminar ayuda').pop() as HTMLButtonElement;
    confirm.click();
    await flushPromises();
    expect(deleteScreenHelp).toHaveBeenCalledWith('/admin/panel');
  });

  it('no ofrece eliminar cuando la pantalla todavía no tiene ayuda', async () => {
    mount(ScreenHelpEditSheet, { attachTo: document.body, props: { screen, help: null, open: true } });
    await flushPromises();

    expect(document.body.querySelector('button[aria-label="Eliminar ayuda"]')).toBeNull();
  });
});
