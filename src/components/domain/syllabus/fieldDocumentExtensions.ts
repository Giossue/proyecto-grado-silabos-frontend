import { mergeAttributes, Node } from '@tiptap/core';
import { TableCell, TableHeader } from '@tiptap/extension-table';

export const DocumentVariable = Node.create<{ labels: Record<string, string> }>({
    name: 'variable',
    group: 'inline',
    inline: true,
    atom: true,
    addOptions: () => ({ labels: {} }),
    addAttributes: () => ({ id: { default: '' }, label: { default: '' }, listStyle: { default: null } }),
    parseHTML: () => [{ tag: 'span[data-variable]', getAttrs: (element) => ({ id: element.getAttribute('data-variable') }) }],
    renderHTML({ node, HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-variable': node.attrs.id, class: 'document-variable', contenteditable: 'false' }), this.options.labels[String(node.attrs.id)] ?? 'Dato del sistema'];
    },
});

const cellAttributes = () => ({
    backgroundColor: { default: null, renderHTML: () => ({}) },
    textColor: { default: null, renderHTML: () => ({}) },
    textAlign: { default: null, renderHTML: () => ({}) },
    bold: { default: null, renderHTML: () => ({}) },
    italic: { default: null, renderHTML: () => ({}) },
    borderStyle: { default: null, renderHTML: () => ({}) },
});
const cellStyle = (attrs: Record<string, unknown>): string => [
    typeof attrs.backgroundColor === 'string' ? `background-color:${attrs.backgroundColor}` : '',
    typeof attrs.textColor === 'string' ? `color:${attrs.textColor}` : '',
    typeof attrs.textAlign === 'string' ? `text-align:${attrs.textAlign}` : '',
    attrs.bold === true ? 'font-weight:bold' : attrs.bold === false ? 'font-weight:normal' : '',
    attrs.italic === true ? 'font-style:italic' : '',
    attrs.borderStyle === 'none' ? 'border:none' : attrs.borderStyle === 'thick' ? 'border-width:2px' : '',
].filter(Boolean).join(';');

export const DocumentTableCell = TableCell.extend({
    addAttributes() { return { ...this.parent?.(), ...cellAttributes() }; },
    renderHTML({ node, HTMLAttributes }) { return ['td', mergeAttributes(HTMLAttributes, { style: cellStyle(node.attrs) }), 0]; },
});
export const DocumentTableHeader = TableHeader.extend({
    addAttributes() { return { ...this.parent?.(), ...cellAttributes() }; },
    renderHTML({ node, HTMLAttributes }) { return ['th', mergeAttributes(HTMLAttributes, { style: cellStyle(node.attrs) }), 0]; },
});
