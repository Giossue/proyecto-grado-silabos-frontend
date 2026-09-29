import type { InjectionKey } from 'vue';

export type TableSection = 'header' | 'body' | 'footer';

export const tableSectionKey: InjectionKey<TableSection> =
    Symbol('table-section');

