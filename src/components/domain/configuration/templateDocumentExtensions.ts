import { Node, mergeAttributes } from '@tiptap/core';
import type { AnyExtension } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';
import type { MentionOptions } from '@tiptap/extension-mention';
import {
    Table,
    TableCell,
    TableHeader,
    TableRow,
} from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontFamily, Color } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { DOCUMENT_COLORS } from '@/lib/documentPalette';
import type { TemplateVariable } from '@/lib/templateDocument';

export const token = (name: 'field' | 'column') =>
    Node.create({
        name,
        group: 'inline',
        inline: true,
        atom: true,
        addAttributes: () => ({
            key: { default: null },
            label: { default: '' },
            kind: { default: 'texto_largo' },
            choice: { default: null },
            listStyle: { default: null },
        }),
        parseHTML: () => [{ tag: `span[data-template-${name}]` }],
        renderHTML: ({ node, HTMLAttributes }) => [
            'span',
            mergeAttributes(HTMLAttributes, {
                [`data-template-${name}`]: node.attrs.key,
                class: 'template-input-token',
                contenteditable: 'false',
            }),
            [
                'span',
                { class: 'template-input-token-generic' },
                name === 'column'
                    ? `$${node.attrs.key}`
                    : 'Respuesta del docente',
            ],
            [
                'span',
                { class: 'template-input-token-label' },
                name === 'column'
                    ? `$${node.attrs.key}`
                    : `${node.attrs.label}${node.attrs.choice ? ` (${node.attrs.choice})` : ''}`,
            ],
        ],
    });
export const cellAttributes = () => ({
    backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-background-color'),
        renderHTML: (attributes: Record<string, unknown>) =>
            attributes.backgroundColor
                ? {
                      'data-background-color': attributes.backgroundColor,
                      style: `background-color: ${attributes.backgroundColor}`,
                  }
                : {},
    },
    textColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-text-color'),
        renderHTML: (attributes: Record<string, unknown>) =>
            attributes.textColor
                ? {
                      'data-cell-text-color': attributes.textColor,
                      style: `color: ${attributes.textColor}`,
                  }
                : {},
    },
    textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-text-align'),
        renderHTML: (attributes: Record<string, unknown>) =>
            attributes.textAlign
                ? {
                      'data-cell-text-align': attributes.textAlign,
                      style: `text-align: ${attributes.textAlign}`,
                  }
                : {},
    },
    bold: {
        default: null,
        parseHTML: (element: HTMLElement) => {
            const value = element.getAttribute('data-cell-bold');

            return value === null ? null : value === 'true';
        },
        renderHTML: (attributes: Record<string, unknown>) =>
            typeof attributes.bold === 'boolean'
                ? {
                      'data-cell-bold': String(attributes.bold),
                      style: `font-weight: ${attributes.bold ? '700' : '400'}`,
                  }
                : {},
    },
    italic: {
        default: null,
        parseHTML: (element: HTMLElement) => {
            const value = element.getAttribute('data-cell-italic');

            return value === null ? null : value === 'true';
        },
        renderHTML: (attributes: Record<string, unknown>) =>
            typeof attributes.italic === 'boolean'
                ? {
                      'data-cell-italic': String(attributes.italic),
                      style: `font-style: ${attributes.italic ? 'italic' : 'normal'}`,
                  }
                : {},
    },
    borderStyle: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-cell-border-style'),
        renderHTML: (attributes: Record<string, unknown>) => {
            const value = attributes.borderStyle;

            return typeof value === 'string'
                ? {
                      'data-cell-border-style': value,
                      style:
                          value === 'none'
                              ? 'border: 0'
                              : `${value === 'thick' ? 'border: 2px' : 'border: 1px'} solid ${DOCUMENT_COLORS.tableBorder}`,
                  }
                : {};
        },
    },
});

export const templateDocumentExtensions = (
    suggestion: MentionOptions<TemplateVariable>['suggestion'],
): AnyExtension[] => [
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
            return { ...this.parent?.(), repeatKey: { default: null } };
        },
    }).configure({
        resizable: true,
        cellMinWidth: 20,
        lastColumnResizable: false,
    }),
    TableRow.extend({
        addAttributes() {
            return { ...this.parent?.(), rowRole: { default: 'fixed' } };
        },
    }),
    TableCell.extend({
        addAttributes() {
            return { ...this.parent?.(), ...cellAttributes() };
        },
    }),
    TableHeader.extend({
        addAttributes() {
            return { ...this.parent?.(), ...cellAttributes() };
        },
    }),
    token('field'),
    token('column'),
    Mention.extend({ name: 'variable' }).configure({
        renderHTML: ({ node, options }) => [
            'span',
            mergeAttributes(options.HTMLAttributes, {
                class: 'template-variable-token',
                'data-variable': node.attrs.id,
            }),
            `@${node.attrs.id}`,
        ],
        suggestion,
    }),
];
