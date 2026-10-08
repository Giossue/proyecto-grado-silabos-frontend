import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAvailableScreenHelp } from '@/api/screen-help';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import { sessionState } from '@/state/session';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ matched: [{ path: '/admin/usuarios' }] }),
}));
vi.mock('@/api/screen-help', () => ({ listAvailableScreenHelp: vi.fn() }));

enableAutoUnmount(afterEach);

const help = { screen: '/admin/usuarios', title: 'Usuarios y roles', content: 'Primer párrafo.\n\nSegundo párrafo.', active: true, updated_at: '2026-10-10T00:00:00Z' };
const signIn = () => sessionState.replace({ user: { id: 'u1' }, active_role: { code: 'administrador' } } as never);
const mountButton = () => mount({ components: { ScreenHelpButton }, template: '<main><ScreenHelpButton /></main>' }, { attachTo: document.body });

describe('ScreenHelpButton', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.mocked(listAvailableScreenHelp).mockReset();
    sessionState.clear();
  });

  it('pide la ayuda de la pantalla y muestra su texto al pulsar el botón', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    expect(listAvailableScreenHelp).toHaveBeenCalledTimes(1);
    await wrapper.get('[aria-label="Ayuda de esta pantalla"]').trigger('click');
    expect(document.body.textContent).toContain('Usuarios y roles');
    expect(document.body.textContent).toContain('Segundo párrafo.');
  });

  it('no muestra el botón si la pantalla no tiene ayuda', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    expect(wrapper.find('[aria-label="Ayuda de esta pantalla"]').exists()).toBe(false);
  });

  it('salta entre las cuatro esquinas con Alt y las flechas y recuerda la esquina', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    const trigger = wrapper.get('[aria-label="Ayuda de esta pantalla"]');
    const stored = () => JSON.parse(localStorage.getItem('silabos:ayuda-posicion') ?? '{}').corner;
    await trigger.trigger('keydown', { key: 'ArrowLeft', altKey: true });
    expect(stored()).toBe('bottom-left');
    await trigger.trigger('keydown', { key: 'ArrowUp', altKey: true });
    expect(stored()).toBe('top-left');
    await trigger.trigger('keydown', { key: 'ArrowRight', altKey: true });
    expect(stored()).toBe('top-right');
    await trigger.trigger('keydown', { key: 'ArrowRight' });
    expect(stored()).toBe('top-right');
  });

  it('al soltar tras arrastrar se acomoda en la esquina más cercana', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();
    const trigger = wrapper.get('[aria-label="Ayuda de esta pantalla"]');
    vi.spyOn(trigger.element.parentElement as HTMLElement, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700, x: 0, y: 0, toJSON: () => ({}) });

    const fire = (type: string, clientX: number, clientY: number) => trigger.element.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
    fire('pointerdown', 950, 650);
    fire('pointermove', 100, 80);
    await flushPromises();
    expect(trigger.attributes('style')).toContain('left:');
    fire('pointerup', 100, 80);
    await flushPromises();

    expect(JSON.parse(localStorage.getItem('silabos:ayuda-posicion') ?? '{}').corner).toBe('top-left');
  });
});
