import { beforeEach, describe, expect, it } from 'vitest';
import { initializeAccessibility, useAccessibility } from '@/composables/useAccessibility';
import { nextTick } from 'vue';

describe('accesibilidad', () => {
  beforeEach(() => {
    localStorage.clear();
    initializeAccessibility();
  });

  it('aplica y recuerda las preferencias', async () => {
    const { settings } = useAccessibility();
    settings.value.highContrast = true;
    settings.value.textSize = '130';
    await nextTick();

    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(document.documentElement.dataset.textSize).toBe('130');
    expect(JSON.parse(localStorage.getItem('silabos:accesibilidad') ?? '{}')).toMatchObject({ highContrast: true, textSize: '130' });

    initializeAccessibility();
    expect(useAccessibility().settings.value.textSize).toBe('130');
  });

  it('ignora valores guardados que no son válidos y restablece', async () => {
    localStorage.setItem('silabos:accesibilidad', JSON.stringify({ textSize: '999', highContrast: 'sí' }));
    initializeAccessibility();
    const { settings, reset } = useAccessibility();
    expect(settings.value.textSize).toBe('100');
    expect(settings.value.highContrast).toBe(false);

    settings.value.wideSpacing = true;
    reset();
    await nextTick();
    expect(document.documentElement.dataset.spacing).toBe('normal');
  });
});
