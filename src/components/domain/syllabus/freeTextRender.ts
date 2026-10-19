import DocumentEvaluation from '@/components/domain/syllabus/DocumentEvaluation.vue';
import DocumentUnits from '@/components/domain/syllabus/DocumentUnits.vue';
import { h } from 'vue';
import type { VNodeChild } from 'vue';
import { identificationTable } from '@/lib/blockLayouts';
import { blockOf, blockPlain, identificationSlotText, type DocumentNode } from '@/lib/templateDocument';

const TAGS: Record<string, string> = {
    paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li',
    table: 'table', tableRow: 'tr', tableCell: 'td', tableHeader: 'th',
};


export const isFreeTextDocument = (value: unknown): value is DocumentNode =>
    typeof value === 'object' && value !== null && (value as DocumentNode).type === 'doc';

export const freeTextPlain = (node: DocumentNode): string =>
    node.type === 'documentBlock' ? blockPlain(node) : node.type === 'text' ? (node.text ?? '') : node.type === 'variable' ? String(node.attrs?.label || 'Dato del sistema') : (node.content ?? []).map(freeTextPlain).join(' ');

export const freeTextLines = (node: DocumentNode): string => {
    if (node.type === 'documentBlock') return blockPlain(node);
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const children = (node.content ?? []).map(freeTextLines);
    if (node.type === 'paragraph') return children.join('');
    if (node.type === 'tableRow') return children.join(' | ');
    if (node.type === 'listItem') return `• ${children.join('\n')}`;

    return children.join('\n');
};


const tableColumnWidths = (table: DocumentNode): number[] | null => {
    for (const row of table.content ?? []) {
        for (const cell of row.content ?? []) {
            const widths = cell.attrs?.colwidth;
            const span = Number(cell.attrs?.colspan ?? 1);
            if (Array.isArray(widths) && widths.length === span && span > 1 && widths.every((width) => typeof width === 'number' && width > 0)) {
                return widths as number[];
            }
        }
    }

    return null;
};

export type RenderOptions = { variable?: (id: string) => VNodeChild | undefined };

const renderBlock = (node: DocumentNode): VNodeChild => {
    const { kind, props, value } = blockOf(node);
    if (kind === 'identificacion') {
        const table = identificationTable();

        return table === null
            ? h('p', {}, 'Identificación institucional')
            : renderFreeText(table, { variable: (id) => identificationSlotText(id, value.disability!) });
    }
    if (kind === 'evaluacion') return h(DocumentEvaluation);
    if (kind === 'unidades') return h(DocumentUnits, { units: value.units ?? [], hours: null, interactive: false });
    const showRows = kind === 'repetible' || (value.answer === 'si' && props.columns.length > 0);
    const table = showRows && props.columns.length > 0
        ? h('table', { class: 'free-text-table' }, [h('tbody', {}, [
            h('tr', {}, props.columns.map((column) => h('th', {}, column.label))),
            ...(value.rows.length > 0 ? value.rows : [{}]).map((row) => h('tr', {}, props.columns.map((column) => h('td', {}, row[column.key] ?? '')))),
        ])])
        : null;
    if (kind === 'repetible') return h('div', { class: 'document-block' }, [props.label ? h('p', {}, [h('strong', {}, props.label)]) : null, table]);

    return h('div', { class: 'document-block' }, [
        h('p', {}, [h('strong', {}, props.question ?? ''), ' ', value.answer === 'si' ? 'Sí' : value.answer === 'no' ? 'No' : h('em', {}, 'Sin responder')]),
        table,
    ]);
};

export const renderFreeText = (node: DocumentNode, options?: RenderOptions): VNodeChild => {
    if (node.type === 'documentBlock') return renderBlock(node);
    if (node.type === 'text') {
        const marks = new Set((node.marks ?? []).map((mark) => mark.type));
        let content: VNodeChild = node.text ?? '';
        if (marks.has('italic')) content = h('em', {}, content);
        if (marks.has('underline')) content = h('u', {}, content);
        if (marks.has('bold')) content = h('strong', {}, content);
        const style = (node.marks ?? []).find((mark) => mark.type === 'textStyle')?.attrs;
        if (style) content = h('span', { style: { color: style.color, fontFamily: style.fontFamily } }, content);

        return content;
    }
    if (node.type === 'variable') {
        const custom = options?.variable?.(String(node.attrs?.id ?? ''));
        if (custom !== undefined) return custom;

        return h('span', { class: 'document-variable' }, String(node.attrs?.label || 'Dato del sistema'));
    }
    if (node.type === 'hardBreak') {
        return h('br');
    }
    const children = (node.content ?? []).map((child) => renderFreeText(child, options));
    if (node.type === 'doc') {
        return h('div', { class: 'free-text-view' }, children);
    }
    if (node.type === 'table') {
        const widths = tableColumnWidths(node);
        if (widths === null) return h('table', { class: 'free-text-table' }, [h('tbody', {}, children)]);
        const total = widths.reduce((sum, width) => sum + width, 0);

        return h('table', { class: 'free-text-table', style: { tableLayout: 'fixed' } }, [
            h('colgroup', {}, widths.map((width) => h('col', { style: { width: `${(width / total) * 100}%` } }))),
            h('tbody', {}, children),
        ]);
    }
    const tag = TAGS[node.type] ?? 'div';
    if (node.type === 'paragraph' && children.length === 0) children.push(h('br'));
    const span = node.type === 'tableCell' || node.type === 'tableHeader'
        ? {
            colspan: Number(node.attrs?.colspan ?? 1),
            rowspan: Number(node.attrs?.rowspan ?? 1),
            style: { backgroundColor: node.attrs?.backgroundColor, color: node.attrs?.textColor, textAlign: node.attrs?.textAlign, fontWeight: node.attrs?.bold === true ? 'bold' : node.attrs?.bold === false ? 'normal' : undefined, fontStyle: node.attrs?.italic === true ? 'italic' : undefined, borderStyle: node.attrs?.borderStyle === 'none' ? 'none' : undefined, borderWidth: node.attrs?.borderStyle === 'thick' ? '2px' : undefined },
        }
        : node.type === 'paragraph' ? { style: { textAlign: node.attrs?.textAlign } } : {};

    return h(tag, span, children);
};
