import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const host = (onClick: () => void) => defineComponent({
  components: { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger },
  setup: () => ({ onClick }),
  template: '<TooltipProvider><Tooltip><TooltipTrigger as-child><button type="button" @click="onClick">Botón</button></TooltipTrigger><TooltipContent>Qué hace</TooltipContent></Tooltip></TooltipProvider>',
});

const press = async (button: HTMLElement, ms: number): Promise<void> => {
  button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
  vi.advanceTimersByTime(ms);
  await nextTick();
  button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await nextTick();
};

describe('Tooltip en pantallas táctiles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('hover: none'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('un toque corto hace la acción y no muestra el tooltip', async () => {
    const onClick = vi.fn();
    const wrapper = mount(host(onClick), { attachTo: document.body });
    await press(wrapper.get('button').element, 50);

    expect(onClick).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain('Qué hace');
    wrapper.unmount();
  });

  it('mantener pulsado muestra qué es y no ejecuta la acción', async () => {
    const onClick = vi.fn();
    const wrapper = mount(host(onClick), { attachTo: document.body });
    await press(wrapper.get('button').element, 600);

    expect(onClick).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Qué hace');
    vi.advanceTimersByTime(2000);
    await nextTick();
    const content = document.querySelector('[data-slot="tooltip-content"]');
    expect(content === null || content.getAttribute('data-state') === 'closed').toBe(true);
    wrapper.unmount();
  });
});
