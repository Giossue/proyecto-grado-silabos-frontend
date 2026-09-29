import type { InjectionKey, Ref } from 'vue';
import { inject, ref } from 'vue';
import type { BreadcrumbItem } from '@/types';

export const breadcrumbsKey: InjectionKey<Ref<BreadcrumbItem[]>> =
    Symbol('breadcrumbs');

export const pageTitleKey: InjectionKey<Ref<string>> = Symbol('page-title');

const EMPTY = ref<BreadcrumbItem[]>([]);
const NO_TITLE = ref('');

export function usePageBreadcrumbs(): Ref<BreadcrumbItem[]> {
    return inject(breadcrumbsKey, EMPTY);
}

export function usePageTitle(): Ref<string> {
    return inject(pageTitleKey, NO_TITLE);
}
