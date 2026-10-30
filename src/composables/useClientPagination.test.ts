import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';

const names = Array.from({ length: 45 }, (_, index) => `Materia ${index + 1}`);

describe('búsqueda en el navegador', () => {
  it('ignora tildes y mayúsculas', () => {
    const filter = useClientFilter(() => ['Matemática', 'Física'], (item) => [item]);
    filter.search.value = 'MATEMATICA';

    expect(filter.items.value).toEqual(['Matemática']);
  });

  it('vuelve a la primera página cuando cambia la búsqueda', async () => {
    const filter = useClientFilter(() => names, (item) => [item]);
    const pagination = useClientPagination(() => filter.items.value, 20, filter.criteria);
    pagination.setPage(2);
    filter.search.value = 'Materia 1';
    await nextTick();

    expect(pagination.currentPage.value).toBe(1);
    expect(pagination.meta.value.total).toBe(11);
  });

  it('conserva la página si no se pide reiniciarla', async () => {
    const pagination = useClientPagination(() => names);
    pagination.setPage(2);
    await nextTick();

    expect(pagination.currentPage.value).toBe(2);
  });
});
