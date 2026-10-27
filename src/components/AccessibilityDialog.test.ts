import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import AccessibilityDialog from '@/components/AccessibilityDialog.vue';
import { initializeAccessibility } from '@/composables/useAccessibility';

enableAutoUnmount(afterEach);

describe('AccessibilityDialog', () => {
  it('abre el modal y cambia el tamaño del texto', async () => {
    localStorage.clear();
    initializeAccessibility();
    const wrapper = mount(AccessibilityDialog, { attachTo: document.body });
    await wrapper.get('[aria-label="Accesibilidad"]').trigger('click');
    await nextTick();

    expect(document.body.textContent).toContain('Alto contraste');
    expect(document.body.textContent).toContain('Sin animaciones');
    const large = [...document.body.querySelectorAll('[role="radio"]')].find((item) => item.textContent?.includes('Muy grande')) as HTMLElement;
    large.click();
    await nextTick();
    expect(document.documentElement.dataset.textSize).toBe('130');
  });

  it('el botón flotante mide lo mismo que el de ayuda', () => {
    const wrapper = mount(AccessibilityDialog, { props: { floating: true } });

    expect(wrapper.get('[aria-label="Accesibilidad"]').classes()).toContain('size-12');
  });
});
