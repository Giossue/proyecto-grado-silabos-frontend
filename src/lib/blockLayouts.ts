import type { DocumentNode } from '@/lib/templateDocument';

export type BlockLayouts = { identificacion?: { table: DocumentNode } };

let layouts: BlockLayouts = {};

export const setBlockLayouts = (next: BlockLayouts | null | undefined): void => {
    if (next) layouts = next;
};

export const identificationTable = (): DocumentNode | null => layouts.identificacion?.table ?? null;
