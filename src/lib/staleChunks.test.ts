import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { installStaleChunkRecovery, isStaleChunkError, reloadForNewVersion } from '@/lib/staleChunks';
import { navigateTo } from '@/lib/pageReload';

vi.mock('@/lib/pageReload', () => ({ navigateTo: vi.fn(), reloadPage: vi.fn() }));

describe('pantallas de una versión anterior', () => {
  beforeEach(() => { sessionStorage.clear(); vi.mocked(navigateTo).mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('reconoce el fallo al cargar una pantalla en Firefox, Chrome y Safari', () => {
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module: http://x/assets/Malla-abc.js'))).toBe(true);
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: http://x/assets/Malla-abc.js'))).toBe(true);
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError(new Error('No se pudo cargar la estructura académica'))).toBe(false);
  });

  it('recarga una sola vez: si vuelve a fallar enseguida, no entra en bucle', () => {
    vi.useFakeTimers();
    expect(reloadForNewVersion('/docente/silabos')).toBe(true);
    expect(reloadForNewVersion('/docente/silabos')).toBe(false);
    expect(navigateTo).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11_000);
    expect(reloadForNewVersion('/docente/silabos')).toBe(true);
  });

  it('si al cambiar de pantalla falta el archivo de la versión anterior, abre esa pantalla con la versión nueva', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/convocatorias', component: { template: '<div />' } },
        { path: '/docente/silabos', component: () => Promise.reject(new TypeError('error loading dynamically imported module: http://x/assets/Docente-old.js')) },
      ],
    });
    installStaleChunkRecovery(router);
    await router.push('/admin/convocatorias');

    await router.push('/docente/silabos?tab=1').catch(() => undefined);
    await flushPromises();

    expect(navigateTo).toHaveBeenCalledWith('/docente/silabos?tab=1');
  });
});
