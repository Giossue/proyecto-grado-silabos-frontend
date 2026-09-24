<script setup lang="ts">
import { defineComponent, h, useId, useSlots } from 'vue';
import { computed } from 'vue';
import type { VNodeChild, CSSProperties } from 'vue';
import type { PlanningExpectations, TableLayout } from '@/lib/tableLayout';
import type { DocumentNode, DocumentField } from '@/lib/templateDocument';
import { DOCUMENT_COLORS } from '@/lib/documentPalette';
import { useTemplateDocumentRows } from '@/composables/useTemplateDocumentRows';
import { createRepeatTable } from '@/components/domain/configuration/templateDocumentRepeat';
import { createDocumentInput } from '@/components/domain/configuration/templateDocumentInput';
import {
    cellBorder,
    columnGroup,
    markStyle,
    textFragments,
} from '@/components/domain/configuration/templateDocumentRender';
import type {
    Context,
    Row,
} from '@/components/domain/configuration/templateDocumentRender';

const props = withDefaults(
    defineProps<{
        document: DocumentNode;
        fields: DocumentField[];
        variables: Record<string, string>;
        layout?: TableLayout | null;
        editable?: boolean;
        preview?: boolean;
        presentation?: 'document' | 'form';
        fontFamily?: string;
        fontSize?: number;
        textColor?: string;
        textAlign?: 'left' | 'center' | 'right' | 'justify';
        tableHeaderBackground?: string;
        tableHeaderColor?: string;
        planningExpectations?: PlanningExpectations | null;
    }>(),
    {
        layout: null,
        editable: false,
        preview: false,
        presentation: 'document',
        fontFamily: 'Arial',
        fontSize: 11,
        textColor: DOCUMENT_COLORS.text,
        textAlign: 'left',
        tableHeaderBackground: DOCUMENT_COLORS.tableHeader,
        tableHeaderColor: DOCUMENT_COLORS.paper,
    },
);
const emit = defineEmits<{
    value: [key: string, value: string | number | boolean];
    rows: [key: string, rows: Row[]];
}>();
const slots = useSlots();
const prefix = useId();
const documentStyle = computed((): CSSProperties & Record<string, string> =>
    props.presentation === 'form'
        ? {}
        : {
              fontFamily: props.fontFamily,
              fontSize: `${props.fontSize}pt`,
              color: props.textColor,
              '--document-text-align': props.textAlign,
              '--document-table-header-background': props.tableHeaderBackground,
              '--document-table-header-color': props.tableHeaderColor,
          },
);
const tableWithAction = (
    table: DocumentNode,
    content: VNodeChild[],
): VNodeChild => {
    const tableAction = slots['table-action'];
    const columnCount = Math.max(
        0,
        ...(table.content ?? []).map((row) =>
            (row.content ?? []).reduce(
                (count, cell) => count + Number(cell.attrs?.colspan ?? 1),
                0,
            ),
        ),
    );
    const repeatsHeader =
        table.content?.[0]?.content?.every(
            (cell) => cell.type === 'tableHeader',
        ) === true;
    const rendered = h(
        'table',
        {
            class: 'document-table',
            'data-wide': columnCount > 3 ? '' : undefined,
            'data-page-repeat-header': repeatsHeader ? '' : undefined,
        },
        [columnGroup(table), h('tbody', {}, content)],
    );

    if (!tableAction && props.presentation !== 'form') {
        return rendered;
    }

    return h('div', { class: 'document-table-container' }, [
        rendered,
        tableAction
            ? h('div', { class: 'document-table-action' }, tableAction())
            : null,
    ]);
};
const { setColumn, addRecord, addUnit, removeUnit, removeRecord } =
    useTemplateDocumentRows({
        layout: () => props.layout,
        planningExpectations: () => props.planningExpectations,
        emit,
    });
const repeatTable = createRepeatTable({
    props,
    draw: (node, context, path) => draw(node, context, path),
    tableWithAction,
    addRecord,
    addUnit,
    removeUnit,
    removeRecord,
});
const input = createDocumentInput({
    props,
    prefix,
    emit,
    setColumn,
    removeRecord,
});

const draw = (
    node: DocumentNode,
    context: Context = {},
    path = 'doc',
): VNodeChild => {
    const attrs = node.attrs ?? {};
    const children = () =>
        (node.content ?? []).map((child, index) =>
            draw(child, context, `${path}-${index}`),
        );

    if (node.type === 'text') {
        return textFragments(node.text ?? '', {
            style: markStyle(node, context.insideCell === true),
        });
    }

    if (node.type === 'hardBreak') {
        return h('br');
    }

    if (node.type === 'variable') {
        return h(
            'span',
            {
                style: markStyle(node, context.insideCell === true),
                'data-variable': String(attrs.id),
                'data-page-fragment': '',
                class: 'document-variable',
            },
            // Un dato automático se muestra con su valor, nunca con su clave. En la
            // vista previa, si no tiene valor, la celda queda vacía como en la hoja.
            props.variables[String(attrs.id)] ||
                (props.preview ? '' : 'Pendiente de Coordinación'),
        );
    }

    if (['field', 'column'].includes(node.type)) {
        return input(node, context, path);
    }

    if (node.type === 'paragraph') {
        return h(
            'div',
            {
                class: 'document-paragraph',
                style: {
                    textAlign: String(
                        context.cellTextAlign ??
                            attrs.textAlign ??
                            (context.insideCell ? 'left' : props.textAlign),
                    ),
                },
                'data-page-unit': '',
                'data-page-flow-through':
                    !props.editable && !context.insideCell ? '' : undefined,
            },
            children(),
        );
    }

    if (node.type === 'table' && attrs.repeatKey && props.layout) {
        const field = props.fields.find(
            (field) => field.key === attrs.repeatKey,
        );

        if (!field) {
            return null;
        }

        return repeatTable(node, field, props.layout, path);
    }

    if (node.type === 'table') {
        return tableWithAction(node, children());
    }

    if (node.type === 'tableRow') {
        return h(
            'tr',
            attrs.rowRole ? { 'data-row-role': String(attrs.rowRole) } : {},
            children(),
        );
    }

    if (node.type === 'tableCell' || node.type === 'tableHeader') {
        const textColor =
            typeof attrs.textColor === 'string' ? attrs.textColor : undefined;
        const textAlign =
            typeof attrs.textAlign === 'string' ? attrs.textAlign : undefined;
        const cellContext = {
            ...context,
            insideCell: true,
            cellTextAlign: textAlign,
        };

        return h(
            node.type === 'tableCell' ? 'td' : 'th',
            {
                colspan: Number(attrs.colspan ?? 1),
                rowspan: Number(attrs.rowspan ?? 1),
                'data-cell-text-color': textColor ? '' : undefined,
                'data-cell-text-align': textAlign ? '' : undefined,
                'data-cell-bold':
                    typeof attrs.bold === 'boolean'
                        ? String(attrs.bold)
                        : undefined,
                'data-cell-italic':
                    typeof attrs.italic === 'boolean'
                        ? String(attrs.italic)
                        : undefined,
                style: {
                    backgroundColor:
                        props.presentation === 'document'
                            ? attrs.backgroundColor || undefined
                            : undefined,
                    color:
                        props.presentation === 'document'
                            ? textColor
                            : undefined,
                    textAlign,
                    fontWeight:
                        props.presentation === 'document' &&
                        typeof attrs.bold === 'boolean'
                            ? attrs.bold
                                ? '700'
                                : '400'
                            : undefined,
                    fontStyle:
                        props.presentation === 'document' &&
                        typeof attrs.italic === 'boolean'
                            ? attrs.italic
                                ? 'italic'
                                : 'normal'
                            : undefined,
                    border:
                        props.presentation === 'document'
                            ? cellBorder(attrs.borderStyle)
                            : undefined,
                },
            },
            (node.content ?? []).map((child, index) =>
                draw(child, cellContext, `${path}-${index}`),
            ),
        );
    }

    const tag =
        { bulletList: 'ul', orderedList: 'ol', listItem: 'li' }[node.type] ??
        'div';

    return h(tag, {}, children());
};
const Content = defineComponent({ setup: () => () => draw(props.document) });
</script>

<template>
    <div
        class="template-document-view"
        :data-preview="preview || undefined"
        :data-themed="preview || undefined"
        :data-presentation="presentation"
        :style="documentStyle"
    >
        <Content />
    </div>
</template>

<style scoped>
.template-document-view {
    color: var(--document-text);
    background: var(--document-paper);
    overflow-wrap: break-word;
}
/*
 * Las celdas no desbordan: primero se separa en sílabas con guion (español) y,
 * solo si una palabra aún no cabe, se corta donde haga falta.
 */
.template-document-view :deep(td),
.template-document-view :deep(th) {
    overflow-wrap: anywhere;
    word-break: normal;
    hyphens: auto;
    -webkit-hyphens: auto;
}
.template-document-view[data-preview] {
    /* The page surfaces supply white; the space between them stays transparent. */
    background: transparent;
}
.template-document-view :deep(.document-paragraph) {
    margin: 0 0 8px;
    min-height: 1em;
    white-space: pre-wrap;
}
.template-document-view[data-themed] :deep(.document-paragraph) {
    text-align: var(--document-text-align) !important;
}
.template-document-view[data-themed]
    :deep([data-cell-text-align] .document-paragraph) {
    text-align: inherit !important;
}
.template-document-view :deep(.document-table) {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    margin: 8px 0;
}
.template-document-view :deep(.document-table-container) {
    position: relative;
}
.template-document-view :deep(.document-table-action) {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;
}
.template-document-view
    :deep(.document-table-container:hover .document-table-action),
.template-document-view
    :deep(.document-table-container:focus-within .document-table-action) {
    pointer-events: auto;
    opacity: 1;
}
.template-document-view :deep(td),
.template-document-view :deep(th) {
    border: 1px solid var(--document-table-border);
    padding: 2px 4px;
    vertical-align: middle;
    font-weight: normal;
}
.template-document-view :deep(.document-table td *),
.template-document-view :deep(.document-table th *) {
    font-family: inherit !important;
    font-size: inherit !important;
}
.template-document-view :deep(td .document-paragraph),
.template-document-view :deep(th .document-paragraph) {
    margin: 0;
}
.template-document-view[data-themed]
    :deep(.document-table > tbody > tr[data-row-role='unit'] > *),
.template-document-view[data-themed] :deep(.document-table th) {
    color: var(--document-table-header-color);
    background-color: var(--document-table-header-background);
}
.template-document-view[data-themed]
    :deep(
        .document-table
            > tbody
            > tr[data-row-role='unit']
            > :not([data-cell-text-color])
            *,
        .document-table th:not([data-cell-text-color]) *
    ) {
    color: var(--document-table-header-color) !important;
}
.template-document-view :deep([data-cell-text-color] *) {
    color: inherit !important;
}
.template-document-view :deep([data-cell-bold='true'] *) {
    font-weight: 700 !important;
}
.template-document-view :deep([data-cell-bold='false'] *) {
    font-weight: 400 !important;
}
.template-document-view :deep([data-cell-italic='true'] *) {
    font-style: italic !important;
}
.template-document-view :deep([data-cell-italic='false'] *) {
    font-style: normal !important;
}
.template-document-view :deep(.document-input) {
    font: inherit;
    color: inherit;
    min-height: 1.5em;
    height: auto;
    padding: 2px;
    background: transparent;
    width: 100%;
}
.template-document-view :deep(ul) {
    list-style: disc;
    padding-left: 24px;
}
.template-document-view :deep(ol) {
    list-style: decimal;
    padding-left: 24px;
}
.template-document-view[data-presentation='form'] {
    color: var(--foreground);
    background: transparent;
    font-family: inherit;
    font-size: 0.875rem;
}
.template-document-view[data-presentation='form']
    :deep(.document-table-container) {
    width: 100%;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    scrollbar-color: var(--border) transparent;
    scrollbar-width: thin;
}
.template-document-view[data-presentation='form'] :deep(.document-table) {
    margin: 0;
}
.template-document-view[data-presentation='form']
    :deep(.document-table[data-wide]) {
    min-width: 64rem;
}
.template-document-view[data-presentation='form'] :deep(td),
.template-document-view[data-presentation='form'] :deep(th) {
    padding: 0.5rem;
    border: 0 !important;
    border-right: 1px solid var(--border) !important;
    border-bottom: 1px solid var(--border) !important;
    color: var(--foreground) !important;
    background: var(--card) !important;
    font-family: inherit !important;
    font-size: 0.875rem !important;
}
.template-document-view[data-presentation='form'] :deep(tr:last-child > *) {
    border-bottom: 0 !important;
}
.template-document-view[data-presentation='form'] :deep(tr > :last-child) {
    border-right: 0 !important;
}
.template-document-view[data-presentation='form'] :deep(.document-table th),
.template-document-view[data-presentation='form']
    :deep(.document-table > tbody > tr[data-row-role='unit'] > *),
.template-document-view[data-presentation='form']
    :deep(.document-table > tbody > tr[data-row-role='total'] > *) {
    color: var(--foreground) !important;
    background: var(--muted) !important;
    font-weight: 600 !important;
}
.template-document-view[data-presentation='form']
    :deep(.document-table :is(td, th) *) {
    color: inherit !important;
    font-family: inherit !important;
    font-size: inherit !important;
}
.template-document-view[data-presentation='form'] :deep(.document-input) {
    min-height: 2.25rem;
    padding: 0.5rem 0.75rem;
    color: var(--foreground);
    background: var(--background);
}
.template-document-view[data-presentation='form']
    :deep(textarea.document-input) {
    min-height: 4rem;
}
</style>
