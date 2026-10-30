import type { LocationQueryValue, Router } from 'vue-router';

type QueryValue = LocationQueryValue | LocationQueryValue[] | undefined;

export const queryText = (value: QueryValue): string => (typeof value === 'string' ? value : '');

export const queryPage = (value: QueryValue): number => Number(queryText(value)) || 1;

export const syncFilters = (router: Router, filters: Record<string, string>, page: number): void => {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== 'all') query[key] = value;
  }
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};
