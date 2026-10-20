import { holds } from '@/lib/blocks/condition';
import { read, Scope, type Path } from '@/lib/blocks/scope';
import type { ValueSchema } from '@/lib/blocks/types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const columnKeys = (path: string, props: Record<string, unknown>): string[] => {
    const columns = read(props, path);
    return Array.isArray(columns) ? columns.map((column) => (isRecord(column) ? column.key : null)).filter((key): key is string => typeof key === 'string') : [];
};

export const emptyValue = (schema: ValueSchema, props: Record<string, unknown>): unknown => {
    switch (schema.type) {
        case 'text':
        case 'number':
            return '';
        case 'choice':
            return null;
        case 'object':
            return Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => [key, emptyValue(field, props)]));
        case 'list':
            return [];
        case 'row':
            return Object.fromEntries(columnKeys(schema.columns, props).map((key) => [key, emptyValue(schema.cell, props)]));
    }
};

const keep = (schema: ValueSchema, value: unknown, props: Record<string, unknown>): unknown => {
    if (schema.type === 'object') {
        const record = isRecord(value) ? { ...value } : {};
        for (const [key, field] of Object.entries(schema.fields)) record[key] = keep(field, record[key], props);
        for (const [key, field] of Object.entries(schema.fields)) {
            if (field.keep_if && !holds(field.keep_if, new Scope(record, props, {}))) record[key] = emptyValue(field, props);
        }
        return record;
    }
    if (schema.type === 'list') return Array.isArray(value) ? value.map((item) => keep(schema.item, item, props)) : [];
    return value;
};

export const settle = (fields: Record<string, ValueSchema>, value: Record<string, unknown>, props: Record<string, unknown>): Record<string, unknown> =>
    keep({ type: 'object', fields }, value, props) as Record<string, unknown>;

export const setAt = (value: unknown, path: Path, next: unknown): unknown => {
    if (path.length === 0) return next;
    const [head, ...rest] = path;
    if (Array.isArray(value)) {
        const copy = [...value];
        copy[Number(head)] = setAt(copy[Number(head)], rest, next);
        return copy;
    }
    const record = isRecord(value) ? value : {};
    return { ...record, [String(head)]: setAt(record[String(head)], rest, next) };
};

export const getAt = (value: unknown, path: Path): unknown => path.reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) return current[Number(segment)];
    return isRecord(current) ? current[String(segment)] : undefined;
}, value);
