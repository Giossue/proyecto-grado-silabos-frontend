import type { BlockDefinition, ValueSchema } from '@/lib/blocks/types';
import { responseDocument } from '@/lib/fieldResponses';
import type { DocumentNode } from '@/lib/templateDocument';

// Datos `from` (ADR-0012): Carrera los guarda en la tabla de su campo y se ven dentro
// del bloque que los usa. La fila es la posición del elemento de la lista que los contiene.

type SourceCell = { path: Array<string | number>; field: string; column: number; row: number };

const tablePath = (node: DocumentNode, path: number[] = []): number[] | null => {
    if (node.type === 'table') return path;
    for (const [index, child] of (node.content ?? []).entries()) {
        const found = tablePath(child, [...path, index]);
        if (found) return found;
    }
    return null;
};

const text = (node: DocumentNode): string => node.type === 'text' ? node.text ?? '' : node.type === 'hardBreak' ? '\n' : (node.content ?? []).map(text).join(node.type === 'paragraph' ? '' : '\n');

const nodeAt = (node: DocumentNode, path: number[]): DocumentNode => path.reduce((current, index) => current.content![index]!, node);

// Posición de cada fila de datos (sin encabezados) dentro de la primera tabla.
const dataRows = (table: DocumentNode): number[] => (table.content ?? []).flatMap((row, index) => (row.content ?? []).some((cell) => cell.type === 'tableHeader') ? [] : [index]);

export const sourceRows = (document: DocumentNode | null | undefined): string[][] => {
    const path = document ? tablePath(document) : null;
    if (!document || !path) return [];
    const table = nodeAt(document, path);
    return dataRows(table).map((index) => (table.content![index]!.content ?? []).map((cell) => text(cell).trim()));
};

// Tipo del bloque que toma datos del campo `key`.
export const sourceBlockKind = (key: string, blocks: Record<string, BlockDefinition>): string | null =>
    Object.entries(blocks).find(([, block]) => cells({ type: 'object', fields: block.value }, 1).some((cell) => cell.field === key))?.[0] ?? null;

const initial = (schema: ValueSchema): unknown => {
    if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => [key, initial(field)]));
    if (schema.type === 'list') return Array.from({ length: schema.initial }, () => initial(schema.item));
    return schema.type === 'choice' ? null : '';
};

const cells = (schema: ValueSchema, row: number, path: Array<string | number> = []): SourceCell[] => {
    if (schema.type === 'text' && schema.from) return [{ path, field: schema.from.field, column: schema.from.column, row }];
    if (schema.type === 'object') return Object.entries(schema.fields).flatMap(([key, field]) => cells(field, row, [...path, key]));
    if (schema.type === 'list') return Array.from({ length: schema.initial }, (_, index) => cells(schema.item, index + 1, [...path, index])).flat();
    return [];
};

const setPath = (value: unknown, path: Array<string | number>, next: unknown): unknown => {
    if (path.length === 0) return next;
    const [head, ...rest] = path;
    const copy: Record<string | number, unknown> = Array.isArray(value) ? [...value] as unknown as Record<number, unknown> : { ...(value as Record<string, unknown>) };
    copy[head!] = setPath(copy[head!], rest, next);
    return copy;
};

const getPath = (value: unknown, path: Array<string | number>): unknown => path.reduce<unknown>((current, segment) => (current as Record<string | number, unknown> | undefined)?.[segment], value);

// Valor del bloque para mostrar en la ficha: vacío salvo los datos de Carrera.
export const blockFromSource = (block: BlockDefinition, key: string, document: DocumentNode | null | undefined): Record<string, unknown> => {
    const rows = sourceRows(document);
    return cells({ type: 'object', fields: block.value }, 1)
        .filter((cell) => cell.field === key)
        .reduce((value, cell) => setPath(value, cell.path, rows[cell.row - 1]?.[cell.column - 1] ?? ''), initial({ type: 'object', fields: block.value })) as Record<string, unknown>;
};

// Escribe en la tabla del campo los datos de Carrera del bloque.
export const sourceFromBlock = (block: BlockDefinition, key: string, value: Record<string, unknown>, template: DocumentNode, current: DocumentNode | null | undefined): DocumentNode => {
    const document = structuredClone(responseDocument(template, current));
    const path = tablePath(document);
    if (!path) return document;
    const table = nodeAt(document, path);
    const rows = dataRows(table);
    for (const cell of cells({ type: 'object', fields: block.value }, 1)) {
        const target = cell.field === key ? table.content?.[rows[cell.row - 1] ?? -1]?.content?.[cell.column - 1] : undefined;
        if (!target) continue;
        const written = String(getPath(value, cell.path) ?? '');
        target.content = [{ type: 'paragraph', ...(written ? { content: [{ type: 'text', text: written }] } : {}) }];
    }
    return document;
};
