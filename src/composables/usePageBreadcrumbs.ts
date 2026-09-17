import type { InjectionKey, Ref } from 'vue';
import { inject, ref } from 'vue';
import type { BreadcrumbItem } from '@/types';

export const breadcrumbsKey: InjectionKey<Ref<BreadcrumbItem[]>> =
    Symbol('breadcrumbs');

/** Nombre de la pantalla abierta. Lo pone el marco de la página; lo lee el encabezado. */
export const pageTitleKey: InjectionKey<Ref<string>> = Symbol('page-title');

const EMPTY = ref<BreadcrumbItem[]>([]);
const NO_TITLE = ref('');

/**
 * El nombre de la pantalla se dice una sola vez, en la miga del encabezado.
 * El encabezado muestra siempre un único elemento: el título actual de la pantalla.
 */
export function usePageBreadcrumbs(): Ref<BreadcrumbItem[]> {
    return inject(breadcrumbsKey, EMPTY);
}

export function usePageTitle(): Ref<string> {
    return inject(pageTitleKey, NO_TITLE);
}
