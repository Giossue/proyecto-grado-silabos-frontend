import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import type { TableAxisItem, TableValue, TypedField } from '@/types/configuration';

const axis = (value: unknown): TableAxisItem[] =>
    Array.isArray(value)
        ? value.filter((item): item is TableAxisItem => typeof item === 'object' && item !== null && typeof (item as TableAxisItem).key === 'string')
            .map((item) => ({ key: item.key, label: String(item.label ?? item.key) }))
        : [];

export const tableColumns = (field: Pick<TypedField, 'config'>): TableAxisItem[] => axis(fieldConfig(field).columns);
export const tableRows = (field: Pick<TypedField, 'config'>): TableAxisItem[] => axis(fieldConfig(field).rows);

export const tableCell = (value: unknown, row: string, column: string): string => {
    const cell = (value as TableValue | null)?.[row]?.[column];
    return typeof cell === 'string' ? cell : '';
};

/** Copia del valor con una celda cambiada; las filas y columnas salen siempre de la plantilla. */
export const withTableCell = (field: Pick<TypedField, 'config'>, value: unknown, row: string, column: string, text: string): TableValue => {
    const next: TableValue = {};
    for (const item of tableRows(field)) {
        next[item.key] = {};
        for (const col of tableColumns(field)) next[item.key]![col.key] = tableCell(value, item.key, col.key);
    }
    next[row]![column] = text;
    return next;
};

export const isTableEmpty = (value: unknown): boolean =>
    typeof value !== 'object' || value === null
    || Object.values(value as TableValue).every((cells) => Object.values(cells ?? {}).every((text) => String(text ?? '').trim() === ''));
