import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getScreenHelp } from '@/api/screen-help';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import { sessionState } from '@/state/session';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ matched: [{ path: '/admin/usuarios' }] }),
}));
vi.mock('@/api/screen-help', () => ({ getScreenHelp: vi.fn() }));

enableAutoUnmount(afterEach);

const help = { screen: '/admin/usuarios', title: 'Usuarios y roles', content: 'Primer párrafo.\n\nSegundo párrafo.', active: true, updated_at: '2026-10-10T00:00:00Z' };
const mountButton = () => mount({ components: { ScreenHelpButton }, template: '<main><ScreenHelpButton /></main>' }, { attachTo: document.body });

describe('ScreenHelpButton', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.mocked(getScreenHelp).mockReset();
    sessionState.current.value = { active_role: { code: 'administrador' } } as never;
  });

  it('pide la ayuda de la pantalla y muestra su texto al pulsar el botón', async () => {
    vi.mocked(getScreenHelp).mockResolvedValue({ help });
    const wrapper = mountButton();
    await flushPromises();

    expect(getScreenHelp).toHaveBeenCalledWith('/admin/usuarios');
    await wrapper.get('[aria-label="Ayuda de esta pantalla"]').trigger('click');
    expect(document.body.textContent).toContain('Usuarios y roles');
    expect(document.body.textContent).toContain('Segundo párrafo.');
  });

  it('no muestra el botón si la pantalla no tiene ayuda', async () => {
    vi.mocked(getScreenHelp).mockResolvedValue({ help: null });
    const wrapper = mountButton();
    await flushPromises();

    expect(wrapper.find('[aria-label="Ayuda de esta pantalla"]').exists()).toBe(false);
  });

  it('se mueve con las flechas y recuerda la posición', async () => {
    vi.mocked(getScreenHelp).mockResolvedValue({ help });
    const wrapper = mountButton();
    await flushPromises();

    await wrapper.get('[aria-label="Ayuda de esta pantalla"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(JSON.parse(localStorage.getItem('silabos:ayuda-posicion') ?? '{}')).toMatchObject({ right: expect.any(Number), bottom: expect.any(Number) });
  });
});
