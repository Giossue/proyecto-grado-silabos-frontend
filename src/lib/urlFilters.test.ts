import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { queryPage, queryText, syncFilters, trackLeaving } from '@/lib/urlFilters';

describe('urlFilters', () => {
  it('lee texto y página con valores por omisión', () => {
    expect(queryText('ana')).toBe('ana');
    expect(queryText(['a', 'b'])).toBe('');
    expect(queryPage('3')).toBe(3);
    expect(queryPage(undefined)).toBe(1);
  });

  it('omite filtros vacíos o en «all» y la primera página', () => {
    const replace = vi.fn();
    syncFilters({ replace } as unknown as Router, { q: 'ana', state: 'all', role: '' }, 1);
    syncFilters({ replace } as unknown as Router, { q: '' }, 2);

    expect(replace).toHaveBeenNthCalledWith(1, { query: { q: 'ana' } });
    expect(replace).toHaveBeenNthCalledWith(2, { query: { page: '2' } });
  });
});

describe('syncFilters mientras se cambia de pantalla', () => {
  it('no cancela la navegación en curso ni lleva el filtro a la otra pantalla', async () => {
    let finishLoading!: () => void;
    const slowPage = new Promise<{ template: string }>((resolve) => { finishLoading = () => resolve({ template: '<div />' }); });
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/usuarios', component: { template: '<div />' } },
      { path: '/facultades', component: () => slowPage },
    ] });
    trackLeaving(router);
    await router.push('/usuarios');

    const leaving = router.push('/facultades');
    await new Promise((resolve) => setTimeout(resolve));
    syncFilters(router, { q: 'ana' }, 1);
    finishLoading();
    await leaving;
    await new Promise((resolve) => setTimeout(resolve));

    expect(router.currentRoute.value.fullPath).toBe('/facultades');
  });

  it('en la misma pantalla sigue guardando el filtro en la URL', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/usuarios', component: { template: '<div />' } }] });
    trackLeaving(router);
    await router.push('/usuarios');

    syncFilters(router, { q: 'ana' }, 2);
    await new Promise((resolve) => setTimeout(resolve));

    expect(router.currentRoute.value.fullPath).toBe('/usuarios?q=ana&page=2');
  });
});
