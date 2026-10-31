import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAvailableScreenHelp } from '@/api/screen-help';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import { sessionState } from '@/state/session';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ matched: [{ path: '/admin/usuarios' }], fullPath: '/admin/usuarios' }),
}));
vi.mock('@/api/screen-help', () => ({ listAvailableScreenHelp: vi.fn() }));

enableAutoUnmount(afterEach);

const help = { screen: '/admin/usuarios', title: 'Usuarios y roles', content: 'Primer párrafo.\n\nSegundo párrafo.' };
const signIn = () => sessionState.replace({ user: { id: 'u1' }, active_role: { code: 'administrador' } } as never);
const mountButton = () => mount({ components: { ScreenHelpButton }, template: '<main><ScreenHelpButton /></main>' }, { attachTo: document.body });
const visible = (element: Element) => Object.defineProperty(element, 'getClientRects', { value: () => [{}] });

describe('ScreenHelpButton', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.mocked(listAvailableScreenHelp).mockReset();
    sessionState.clear();
  });

  it('sin elementos que señalar, la guía muestra el texto completo de la pantalla', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    expect(listAvailableScreenHelp).toHaveBeenCalledTimes(1);
    await wrapper.get('[aria-label="Ayuda de esta pantalla"]').trigger('click');
    const popover = document.body.querySelector('.driver-popover')!;
    expect(popover.textContent).toContain('Usuarios y roles');
    expect(popover.textContent).toContain('Segundo párrafo.');
  });

  it('con elementos en pantalla, empieza por el texto de la pantalla y recorre cada elemento con su avance', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    document.body.insertAdjacentHTML('beforeend', '<div data-tour="page-actions">Acciones</div><div data-slot="table-container">Tabla</div>');
    document.body.querySelectorAll('[data-tour], [data-slot]').forEach(visible);
    const wrapper = mountButton();
    await flushPromises();

    await wrapper.get('[aria-label="Ayuda de esta pantalla"]').trigger('click');
    let popover = document.body.querySelector('.driver-popover')!;
    expect(popover.textContent).toContain('Primer párrafo.');
    expect(popover.textContent).not.toContain('Segundo párrafo.');
    (popover.querySelector('.driver-popover-next-btn') as HTMLElement).click();
    popover = document.body.querySelector('.driver-popover')!;
    expect(popover.textContent).toContain('Crear cuentas');
    expect(popover.textContent).toContain('2 de 3');
  });

  it('no muestra el botón si la pantalla no tiene ayuda', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    expect(wrapper.find('[aria-label="Ayuda de esta pantalla"]').exists()).toBe(false);
  });

  it('queda fijo arriba del botón de accesibilidad, sin poder moverse', async () => {
    vi.mocked(listAvailableScreenHelp).mockResolvedValue({ help: [help] });
    signIn();
    const wrapper = mountButton();
    await flushPromises();

    const classes = wrapper.get('[aria-label="Ayuda de esta pantalla"]').classes();
    expect(classes).toContain('fixed');
    expect(classes).toContain('sm:bottom-20');
    expect(classes).toContain('sm:right-4');
  });
});
