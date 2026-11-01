import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { getCatalogLibraries, type CatalogLibrary } from '@/api/libraryCatalog';

/** Bibliotecas que publica Koha, para elegir por nombre. */
export const useCatalogLibraries = () => {
    const libraries = ref<CatalogLibrary[] | null>(null);
    const error = ref<string | null>(null);
    const load = async (): Promise<void> => {
        libraries.value = null;
        error.value = null;
        try {
            libraries.value = await getCatalogLibraries();
        } catch (reason) {
            error.value = reason instanceof ApiError ? reason.message : 'No se pudo consultar la lista de bibliotecas.';
        }
    };

    return { libraries, error, load };
};

/** Códigos marcados al abrir: una lista guardada vacía significa «todas». */
export const initialLibraries = (saved: string[], known: CatalogLibrary[]): string[] => (saved.length === 0 ? known.map((library) => library.id) : [...saved]);

/** Lista a guardar: marcar todas equivale a «todas» y se guarda vacía, así entran también las que se agreguen después. */
export const librariesToStore = (chosen: string[], known: CatalogLibrary[]): string[] =>
    known.length > 0 && known.every((library) => chosen.includes(library.id)) ? [] : [...chosen];

export const sameLibraries = (first: string[], second: string[]): boolean => first.length === second.length && first.every((code) => second.includes(code));
