import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MobileFilterSheet from '@/components/domain/MobileFilterSheet.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';

enableAutoUnmount(afterEach);

describe('MobileFilterSheet', () => {
  afterEach(() => vi.useRealTimers());

  it('en el celular sale como los modales: se desvanece y recién después se oculta', async () => {
    vi.useFakeTimers();
    const wrapper = mount(MobileFilterSheet, { attachTo: document.body, slots: { default: '<select><option value="all">Todos</option></select>' } });
    const panel = () => wrapper.get('[role="group"]');
    expect(panel().classes()).toContain('max-sm:hidden');

    await wrapper.get('button[aria-expanded]').trigger('click');
    expect(panel().attributes('data-state')).toBe('open');
    expect(panel().classes()).not.toContain('max-sm:hidden');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver resultados')!.trigger('click');
    expect(panel().attributes('data-state')).toBe('closed');
    expect(panel().classes()).not.toContain('max-sm:hidden');
    expect(document.body.style.overflow).toBe('');

    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(panel().classes()).toContain('max-sm:hidden');
  });

  it('si se vuelve a abrir mientras se desvanece, queda abierto', async () => {
    vi.useFakeTimers();
    const wrapper = mount(MobileFilterSheet, { attachTo: document.body });
    const panel = () => wrapper.get('[role="group"]');
    await wrapper.get('button[aria-expanded]').trigger('click');
    await wrapper.get('button[aria-label="Cerrar filtros"]').trigger('click');
    await wrapper.get('button[aria-expanded]').trigger('click');

    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(panel().attributes('data-state')).toBe('open');
    expect(panel().classes()).not.toContain('max-sm:hidden');
  });
});
