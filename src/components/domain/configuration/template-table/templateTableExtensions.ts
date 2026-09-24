import { mergeAttributes, Node } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import {
    Table,
    TableCell,
    TableHeader,
    TableRow,
    TableView,
} from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Color, FontFamily, TextStyle } from '@tiptap/extension-text-style';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import TemplateTableInlineNode from '@/components/domain/configuration/TemplateTableInlineNode.vue';
import { DOCUMENT_COLORS } from '@/lib/documentPalette';

class ResponsiveTableView extends TableView {
    constructor(
        node: ProseMirrorNode,
        cellMinWidth: number,
        view?: EditorView,
        HTMLAttributes: Record<string, unknown> = {},
    ) {
        super(node, cellMinWidth, view, HTMLAttributes);
        this.fitColumns();
    }

    update(node: ProseMirrorNode): boolean {
        const updated = super.update(node);

        if (updated) {
            this.fitColumns();
        }

        return updated;
    }

    private fitColumns(): void {
        const columns = Array.from(
            this.colgroup.children,
        ) as HTMLTableColElement[];
        const widths = columns.map(
            (column) =>
                Number.parseFloat(column.style.width) ||
                Number.parseFloat(column.style.minWidth) ||
                1,
        );
        const total = widths.reduce((sum, width) => sum + width, 0);

        columns.forEach((column, index) => {
            column.style.width = `${(widths[index] / total) * 100}%`;
            column.style.minWidth = '0';
        });
        this.table.style.width = '100%';
        this.table.style.minWidth = '0';
    }
}

const cellStyle = (attributes: Record<string, unknown>) => {
    const styles: string[] = [];

    if (typeof attributes.backgroundColor === 'string') {
        styles.push(`background-color: ${attributes.backgroundColor}`);
    }

    if (typeof attributes.textColor === 'string') {
        styles.push(`color: ${attributes.textColor}`);
    }

    if (typeof attributes.textAlign === 'string') {
        styles.push(`text-align: ${attributes.textAlign}`);
    }

    if (typeof attributes.bold === 'boolean') {
        styles.push(`font-weight: ${attributes.bold ? '700' : '400'}`);
    }

    if (typeof attributes.italic === 'boolean') {
        styles.push(`font-style: ${attributes.italic ? 'italic' : 'normal'}`);
    }

    if (typeof attributes.borderStyle === 'string') {
        styles.push(
            attributes.borderStyle === 'none'
                ? 'border: 0'
                : `border: ${attributes.borderStyle === 'thick' ? '2px' : '1px'} solid ${DOCUMENT_COLORS.tableBorder}`,
        );
    }

    return styles.join('; ');
};

const cellAttributes = () => ({
    backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-background-color'),
    },
    textColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-text-color'),
    },
    textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-text-align'),
    },
    bold: {
        default: null,
        parseHTML: (element: HTMLElement) => {
            const value = element.getAttribute('data-cell-bold');

            return value === null ? null : value === 'true';
        },
    },
    italic: {
        default: null,
        parseHTML: (element: HTMLElement) => {
            const value = element.getAttribute('data-cell-italic');

            return value === null ? null : value === 'true';
        },
    },
    borderStyle: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-border-style'),
    },
});

const cellDomAttributes = (attributes: Record<string, unknown>) => {
    const {
        backgroundColor,
        textColor,
        textAlign,
        bold,
        italic,
        borderStyle,
        ...structural
    } = attributes;

    return mergeAttributes(structural, {
        'data-background-color': backgroundColor ?? undefined,
        'data-cell-text-color': textColor ?? undefined,
        'data-cell-text-align': textAlign ?? undefined,
        'data-cell-bold': typeof bold === 'boolean' ? String(bold) : undefined,
        'data-cell-italic':
            typeof italic === 'boolean' ? String(italic) : undefined,
        'data-cell-border-style': borderStyle ?? undefined,
        style: cellStyle(attributes),
    });
};

const StyledTableCell = TableCell.extend({
    addAttributes() {
        return { ...this.parent?.(), ...cellAttributes() };
    },
    renderHTML({ HTMLAttributes }) {
        return ['td', cellDomAttributes(HTMLAttributes), 0];
    },
});

const StyledTableHeader = TableHeader.extend({
    addAttributes() {
        return { ...this.parent?.(), ...cellAttributes() };
    },
    renderHTML({ HTMLAttributes }) {
        return ['th', cellDomAttributes(HTMLAttributes), 0];
    },
});

const inlineNode = (name: 'field' | 'column' | 'variable') =>
    Node.create({
        name,
        group: 'inline',
        inline: true,
        atom: true,
        addAttributes: () =>
            name === 'variable'
                ? {
                      id: { default: null },
                      label: { default: '' },
                  }
                : {
                      key: { default: null },
                      label: { default: '' },
                      kind: { default: 'texto_largo' },
                      choice: { default: null },
                      options: { default: null },
                      listStyle: { default: null },
                      ...(name === 'column'
                          ? {
                                role: { default: null },
                                sum: { default: null },
                            }
                          : {}),
                  },
        parseHTML: () => [
            {
                tag:
                    name === 'variable'
                        ? '[data-template-variable]'
                        : `[data-template-${name}]`,
            },
        ],
        renderHTML: ({ node, HTMLAttributes }) => {
            const label =
                name === 'variable'
                    ? `@${node.attrs.id}`
                    : name === 'column'
                      ? `$${node.attrs.key}`
                      : node.attrs.choice
                        ? `X si ${node.attrs.label} = ${node.attrs.choice}`
                        : node.attrs.label;

            return [
                'span',
                mergeAttributes(HTMLAttributes, {
                    [name === 'variable'
                        ? 'data-template-variable'
                        : `data-template-${name}`]:
                        name === 'variable' ? node.attrs.id : node.attrs.key,
                    class:
                        name === 'variable'
                            ? 'template-table-variable'
                            : 'template-table-field',
                    contenteditable: 'false',
                }),
                label,
            ];
        },
        addNodeView() {
            return VueNodeViewRenderer(TemplateTableInlineNode);
        },
    });

export const templateTableExtensions = (): Extensions => [
    StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        trailingNode: false,
    }),
    TextStyle,
    FontFamily,
    Color,
    TextAlign.configure({ types: ['paragraph'] }),
    Table.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                repeatKey: { default: null },
                repeatLabel: { default: null },
                groupByUnit: { default: null },
                visualStructure: { default: null },
            };
        },
    }).configure({
        resizable: false,
        renderWrapper: true,
        View: ResponsiveTableView,
        // Las celdas visibles conservan 20 px por CSS. Una división lógica
        // puede ser menor cuando otra fila mantiene un borde cercano.
        cellMinWidth: 1,
        lastColumnResizable: false,
    }),
    TableRow.extend({
        addAttributes() {
            return { ...this.parent?.(), rowRole: { default: 'fixed' } };
        },
    }),
    StyledTableCell,
    StyledTableHeader,
    inlineNode('field'),
    inlineNode('column'),
    inlineNode('variable'),
];
