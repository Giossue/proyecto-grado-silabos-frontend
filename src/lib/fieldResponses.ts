import type { DocumentNode } from '@/lib/templateDocument';
import { blockFilledText } from '@/lib/blocks/runtime';

export const cloneResponse = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const blankResponse = (node: DocumentNode): boolean =>
    ['doc', 'paragraph', 'tableCell'].includes(node.type)
    && (node.content ?? []).every((child) => child.type === 'paragraph' && blankResponse(child));

export const responseListTable = (node: DocumentNode): boolean => {
    const rows = [...(node.content ?? [])];
    const last = rows.pop();
    return rows.length > 0 && Boolean(last?.content?.length)
        && rows.every((row) => Boolean(row.content?.length) && row.content!.every((cell) => cell.type === 'tableHeader'))
        && last!.content!.every((cell) => blankResponse(cell) && Number(cell.attrs?.rowspan ?? 1) === 1);
};

export const responseDocument = (template: DocumentNode, value?: DocumentNode | null): DocumentNode => {
    if (!value || value.type !== template.type) return cloneResponse(template);
    if (template.type === 'tableHeader') return cloneResponse(template);
    if (blankResponse(template)) return { ...cloneResponse(template), content: cloneResponse(value.content ?? []) };
    if (template.type === 'documentBlock') return { ...cloneResponse(template), attrs: { ...template.attrs, value: cloneResponse(value.attrs?.value ?? template.attrs?.value ?? {}) } };
    const children = template.content ?? [];
    const count = template.type === 'table' && responseListTable(template) ? Math.max(children.length, value.content?.length ?? 0) : children.length;
    return children.length === 0 ? cloneResponse(template) : {
        ...cloneResponse(template),
        content: Array.from({ length: count }, (_, index) => responseDocument(children[index] ?? children[children.length - 1]!, value.content?.[index])),
    };
};

export const responseAt = (document: DocumentNode, path: number[]): DocumentNode =>
    path.reduce((node, index) => node.content![index]!, document);

export const replaceResponse = (document: DocumentNode, path: number[], value: DocumentNode): DocumentNode => {
    if (path.length === 0) return value;
    const next = cloneResponse(document);
    responseAt(next, path.slice(0, -1)).content![path[path.length - 1]!] = value;
    return next;
};

export const responseText = (node: DocumentNode): string => node.type === 'documentBlock' ? blockFilledText(node) : node.type === 'text' ? node.text ?? '' : (node.content ?? []).map(responseText).join(' ');

export const responseEmpty = (template: DocumentNode | undefined, value: DocumentNode | null | undefined): boolean => {
    if (!value) return true;
    if (!template || blankResponse(template) || template.type === 'documentBlock') return responseText(value).trim() === '';
    if (template.type === 'tableHeader') return true;
    const children = template.content ?? [];
    return (value.content ?? []).every((child, index) => {
        const source = children[index] ?? (template.type === 'table' && responseListTable(template) ? children[children.length - 1] : undefined);
        return !source || responseEmpty(source, child);
    });
};
