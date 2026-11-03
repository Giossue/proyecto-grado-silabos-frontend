import { nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DIALOG_EXIT_MS, afterDialogExit, useShownWhileClosing } from '@/lib/dialogExit';

describe('salida de los modales', () => {
  afterEach(() => vi.useRealTimers());

  it('espera lo que dura la animación de salida antes de seguir', async () => {
    vi.useFakeTimers();
    let done = false;
    void afterDialogExit().then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('conserva lo último que se mostró cuando el modal se cierra, y lo cambia al abrir otro', async () => {
    const removing = ref<{ name: string } | null>(null);
    const shown = useShownWhileClosing(() => removing.value);
    expect(shown.value).toBeNull();

    removing.value = { name: 'Ana' };
    await nextTick();
    expect(shown.value?.name).toBe('Ana');
    removing.value = null;
    await nextTick();
    expect(shown.value?.name).toBe('Ana');
    removing.value = { name: 'Luis' };
    await nextTick();
    expect(shown.value?.name).toBe('Luis');
  });
});
