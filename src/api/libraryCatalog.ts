import { api } from '@/api/client';

export type CatalogSearchField = 'any' | 'title' | 'author' | 'isbn';
export type CatalogBook = {
    id: string;
    title: string;
    author: string;
    year: string;
    place: string;
    publisher: string;
    isbn: string;
    call_number: string;
};

export const searchLibraryCatalog = (field: CatalogSearchField, q: string) =>
    api<{ data: CatalogBook[] }>(`/teacher/library-catalog/search?${new URLSearchParams({ field, q })}`).then((payload) => payload.data);
