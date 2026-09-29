import { h } from 'vue';
import type { VNodeChild } from 'vue';
import type { DocumentNode } from '@/lib/templateDocument';

const TAGS: Record<string, string> = {
    paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li',
    table: 'table', tableRow: 'tr', tableCell: 'td', tableHeader: 'th',
};

export const isFreeTextDocument = (value: unknown): value is DocumentNode =>
    typeof value === 'object' && value !== null && (value as DocumentNode).type === 'doc';

export const freeTextPlain = (node: DocumentNode): string =>
    node.type === 'text' ? (node.text ?? '') : (node.content ?? []).map(freeTextPlain).join(' ');

export const freeTextLines = (node: DocumentNode): string => {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const children = (node.content ?? []).map(freeTextLines);
    if (node.type === 'paragraph') return children.join('');
    if (node.type === 'tableRow') return children.join(' | ');
    if (node.type === 'listItem') return `• ${children.join('\n')}`;

    return children.join('\n');
};

export const renderFreeText = (node: DocumentNode): VNodeChild => {
    if (node.type === 'text') {
        const marks = new Set((node.marks ?? []).map((mark) => mark.type));
        let content: VNodeChild = node.text ?? '';
        if (marks.has('italic')) content = h('em', {}, content);
        if (marks.has('bold')) content = h('strong', {}, content);

        return content;
    }
    if (node.type === 'hardBreak') {
        return h('br');
    }
    const children = (node.content ?? []).map(renderFreeText);
    if (node.type === 'doc') {
        return h('div', { class: 'free-text-view' }, children);
    }
    if (node.type === 'table') {
        return h('table', { class: 'free-text-table' }, [h('tbody', {}, children)]);
    }
    const tag = TAGS[node.type] ?? 'div';
    const span = node.type === 'tableCell' || node.type === 'tableHeader'
        ? { colspan: Number(node.attrs?.colspan ?? 1), rowspan: Number(node.attrs?.rowspan ?? 1) }
        : {};

    return h(tag, span, children);
};
