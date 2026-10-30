import { describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { queryPage, queryText, syncFilters } from '@/lib/urlFilters';

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
