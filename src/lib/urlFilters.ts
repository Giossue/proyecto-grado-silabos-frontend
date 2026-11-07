import type { LocationQueryValue, Router } from 'vue-router';

type QueryValue = LocationQueryValue | LocationQueryValue[] | undefined;

export const queryText = (value: QueryValue): string => (typeof value === 'string' ? value : '');

export const queryPage = (value: QueryValue): number => Number(queryText(value)) || 1;

let leaving = false;

/** Una respuesta tardía no debe cancelar el cambio de pantalla que ya está en curso. */
export const trackLeaving = (router: Router): void => {
  router.beforeEach((to, from) => { leaving = to.path !== from.path; });
  router.afterEach(() => { leaving = false; });
};

export const syncFilters = (router: Router, filters: Record<string, string>, page: number): void => {
  if (leaving) return;
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== 'all') query[key] = value;
  }
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};
