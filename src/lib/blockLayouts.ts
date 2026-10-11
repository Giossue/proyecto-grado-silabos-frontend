import type { DocumentNode } from '@/lib/templateDocument';

export type BlockLayouts = {
    identificacion?: { table: DocumentNode };
    unidades?: { weeks: number; hours: { acd: number; ape: number; aa: number } };
    evaluacion?: { with_practice: boolean };
};

let layouts: BlockLayouts = {};

export const setBlockLayouts = (next: BlockLayouts | null | undefined): void => {
    if (next) layouts = next;
};

export const identificationTable = (): DocumentNode | null => layouts.identificacion?.table ?? null;

export const unitsContext = (): NonNullable<BlockLayouts['unidades']> | null => layouts.unidades ?? null;
export const evaluationWithPractice = (): boolean => layouts.evaluacion?.with_practice ?? true;
