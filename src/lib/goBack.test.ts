import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { goBack } from '@/lib/goBack';

const router = () => ({ back: vi.fn(), push: vi.fn() }) as unknown as Router & { back: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };

describe('goBack', () => {
  afterEach(() => { window.history.replaceState(null, ''); });

  it('vuelve a la lista tal como estaba, con su pestaña y filtros', () => {
    window.history.replaceState({ back: '/coordinacion/revisiones?tab=seguimiento&search=alg' }, '');
    const target = router();

    goBack(target, '/coordinacion/revisiones');

    expect(target.back).toHaveBeenCalled();
    expect(target.push).not.toHaveBeenCalled();
  });

  it('sin historial de la lista, va a la lista', () => {
    window.history.replaceState({ back: '/coordinacion/revisiones/otra-revision' }, '');
    const target = router();

    goBack(target, '/coordinacion/revisiones');

    expect(target.push).toHaveBeenCalledWith('/coordinacion/revisiones');
    expect(target.back).not.toHaveBeenCalled();
  });
});
