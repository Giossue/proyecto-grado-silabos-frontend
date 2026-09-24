<script setup lang="ts">
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Selection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useTemplateDocumentField } from '@/composables/useTemplateDocumentField';
import { useVariableSuggestions } from '@/composables/useVariableSuggestions';
import { DOCUMENT_COLORS } from '@/lib/documentPalette';
import {
    cellNode,
    fieldNode,
    nodesOfType,
    textNode,
} from '@/lib/templateDocument';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import TemplateDocumentContextMenu from './TemplateDocumentContextMenu.vue';
import { templateDocumentExtensions } from './templateDocumentExtensions';

const props = defineProps<{
    document: DocumentNode;
    variables: TemplateVariable[];
    pending: boolean;
    fieldKeys?: string[];
    embedded?: boolean;
}>();
const emit = defineEmits<{
    save: [document: DocumentNode];
    dirty: [value: boolean];
    properties: [];
}>();
const rows = ref(3);
const columns = ref(3);
const initial = ref(JSON.stringify(props.document));
const persistedKeys = new Set([
    ...(props.fieldKeys ??
        nodesOfType(props.document, 'field').map((node) =>
            String(node.attrs?.key),
        )),
    ...nodesOfType(props.document, 'column').map((node) =>
        String(node.attrs?.key),
    ),
]);
const dirty = ref(false);
const toolbarVersion = ref(0);
const { suggestions, selectedSuggestion, chooseVariable, suggestion } =
    useVariableSuggestions({
        variables: () => props.variables,
        allowTeacher: () => !repeatTable.value || rowRole.value !== 'total',
        teacherNode: () => teacherNode('Respuesta del docente', 'texto_largo'),
    });
const editor = useEditor({
    content: props.document,
    editorProps: {
        attributes: {
            'aria-label': 'Diseño del contenido de la plantilla',
            role: 'textbox',
            'aria-multiline': 'true',
            spellcheck: 'true',
        },
    },
    extensions: templateDocumentExtensions(suggestion),
    onUpdate: ({ editor: current }) => {
        dirty.value = JSON.stringify(current.getJSON()) !== initial.value;
    },
    onTransaction: () => {
        toolbarVersion.value++;
    },
});
const state = computed(() => {
    void toolbarVersion.value;

    return editor.value;
});
const repeatTable = computed(() => {
    void toolbarVersion.value;

    return editor.value?.getAttributes('table').repeatKey as
        string | null | undefined;
});
const rowRole = computed(() => {
    void toolbarVersion.value;

    return String(editor.value?.getAttributes('tableRow').rowRole ?? 'fixed');
});
const selectedField = computed(() => {
    void toolbarVersion.value;
    const selection = editor.value?.state.selection;

    return selection instanceof NodeSelection &&
        ['field', 'column'].includes(selection.node.type.name)
        ? selection.node
        : null;
});
const { fieldLabel, fieldType, fieldDraftDirty, fieldTypes } =
    useTemplateDocumentField(selectedField, persistedKeys);
const context = ref<'text' | 'table' | 'field'>('text');
let preservedContextSelection: Selection | null = null;
watch([dirty, fieldDraftDirty], ([documentChanged, fieldChanged]) =>
    emit('dirty', documentChanged || fieldChanged),
);
const makeField = (label: string, format = 'texto_largo') => {
    const node = fieldNode({
        key: `campo_${crypto.randomUUID().replaceAll('-', '')}`,
        label,
        type: ['bulleted_list', 'numbered_list'].includes(format)
            ? 'texto_largo'
            : format,
    });
    node.attrs!.listStyle =
        format === 'bulleted_list'
            ? 'bullet'
            : format === 'numbered_list'
              ? 'number'
              : null;

    return node;
};
const teacherNode = (label: string, format: string) => {
    const node = makeField(label, format);

    if (repeatTable.value && ['record', 'unit'].includes(rowRole.value)) {
        node.type = 'column';

        if (
            rowRole.value === 'unit' ||
            !['numero', 'texto_largo'].includes(String(node.attrs!.kind))
        ) {
            node.attrs!.kind = 'texto_largo';
        }
    }

    return node;
};
const updateField = () => {
    const node = selectedField.value;

    if (!node || !editor.value || !fieldLabel.value.trim() || props.pending) {
        return;
    }

    const attrs = makeField(fieldLabel.value.trim(), fieldType.value).attrs!;
    const transaction = editor.value.state.tr;
    editor.value.state.doc.descendants((child, position) => {
        if (
            child.type.name === node.type.name &&
            child.attrs.key === node.attrs.key
        ) {
            transaction.setNodeMarkup(position, undefined, {
                ...child.attrs,
                label: persistedKeys.has(String(node.attrs.key))
                    ? child.attrs.label
                    : attrs.label,
                listStyle: attrs.listStyle,
                kind: persistedKeys.has(String(node.attrs.key))
                    ? child.attrs.kind
                    : attrs.kind,
            });
        }
    });
    transaction.setSelection(
        NodeSelection.create(
            transaction.doc,
            editor.value.state.selection.from,
        ),
    );
    editor.value.view.dispatch(transaction);
};
const insertTeacherField = () => {
    const current = editor.value;

    if (!current || props.pending) {
        return;
    }

    const position = current.state.selection.from;
    current
        .chain()
        .focus()
        .insertContent(teacherNode('Respuesta del docente', 'texto_largo'))
        .setNodeSelection(position)
        .run();
};
const insertVariable = (variable: TemplateVariable) => {
    editor.value
        ?.chain()
        .focus()
        .insertContent([
            {
                type: 'variable',
                attrs: { id: variable.key, label: variable.key },
            },
            { type: 'text', text: ' ' },
        ])
        .run();
};
const initialOnlyField = (document: DocumentNode): DocumentNode | null => {
    const content = (document.content ?? []).filter(
        (node) => node.type !== 'paragraph' || (node.content?.length ?? 0) > 0,
    );
    const paragraphContent = content[0]?.content ?? [];

    return content.length === 1 &&
        content[0]?.type === 'paragraph' &&
        paragraphContent.length === 1 &&
        paragraphContent[0]?.type === 'field'
        ? paragraphContent[0]
        : null;
};
const insertTable = (
    requestedRows: number = rows.value,
    requestedColumns: number = columns.value,
) => {
    const rowCount = Math.max(1, Math.min(20, Number(requestedRows) || 3));
    const columnCount = Math.max(
        1,
        Math.min(12, Number(requestedColumns) || 3),
    );
    const current = editor.value?.getJSON() as DocumentNode | undefined;
    const initialField = current ? initialOnlyField(current) : null;
    const firstResponseRow = rowCount > 1 ? 1 : 0;
    const table: DocumentNode = {
        type: 'table',
        attrs: { repeatKey: null },
        content: Array.from({ length: rowCount }, (_, r) => ({
            type: 'tableRow',
            attrs: { rowRole: 'fixed' },
            content: Array.from({ length: columnCount }, (_, c) => {
                const isInitialResponse =
                    initialField && r === firstResponseRow && c === 0;

                return cellNode(
                    isInitialResponse
                        ? [initialField]
                        : r === 0 && firstResponseRow !== 0
                          ? [textNode(`Columna ${c + 1}`)]
                          : [],
                    1,
                    1,
                    r === 0 && firstResponseRow !== 0
                        ? DOCUMENT_COLORS.lightBlue
                        : null,
                );
            }),
        })),
    };

    if (initialField) {
        editor.value?.commands.setContent({ type: 'doc', content: [table] });

        return;
    }

    editor.value?.chain().focus().insertContent(table).run();
};
const prepareDocument = (): DocumentNode | null => {
    if (selectedField.value && !fieldLabel.value.trim()) {
        return null;
    }

    if (editor.value) {
        updateField();

        return editor.value.getJSON() as DocumentNode;
    }

    return null;
};
const save = () => {
    const value = prepareDocument();

    if (value) {
        emit('save', value);
    }
};
const markClean = () => {
    if (!editor.value) {
        return;
    }

    initial.value = JSON.stringify(editor.value.getJSON());
    dirty.value = false;
};
const setFieldPresentation = (value: string) => {
    fieldType.value = value;
    updateField();
};
const preserveContextSelection = (event: PointerEvent) => {
    if (event.button === 2 && editor.value) {
        preservedContextSelection = editor.value.state.selection;
    }
};
const prepareContextMenu = (event: MouseEvent) => {
    const current = editor.value;
    const target = event.target as Element | null;

    if (!current || !target) {
        return;
    }

    const field = target.closest(
        '[data-template-field], [data-template-column]',
    );
    const preserved = preservedContextSelection;
    preservedContextSelection = null;

    if (field) {
        const position = current.view.posAtDOM(field, 0);
        current.view.dispatch(
            current.state.tr.setSelection(
                NodeSelection.create(current.state.doc, position),
            ),
        );
        context.value = 'field';

        return;
    }

    const position = current.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
    });
    const tableCell = target.closest('td, th');

    if (
        preserved &&
        ((tableCell && preserved instanceof CellSelection) ||
            (!tableCell && !preserved.empty))
    ) {
        current.view.dispatch(current.state.tr.setSelection(preserved));
    }

    const selection = current.state.selection;

    if (
        position &&
        !(tableCell && current.state.selection instanceof CellSelection) &&
        (selection.empty ||
            position.pos < selection.from ||
            position.pos > selection.to)
    ) {
        current.view.dispatch(
            current.state.tr.setSelection(
                TextSelection.near(current.state.doc.resolve(position.pos)),
            ),
        );
    }

    context.value = tableCell ? 'table' : 'text';
};
const clipboard = async (action: 'cut' | 'copy' | 'paste') => {
    const current = editor.value;

    if (!current) {
        return;
    }

    current.view.focus();

    if (action !== 'paste') {
        document.execCommand(action);

        return;
    }

    try {
        const value = await navigator.clipboard.readText();
        current.chain().focus().insertContent(value).run();
    } catch {
        // El navegador puede negar lectura del portapapeles; Ctrl+V sigue disponible.
    }
};
const unsaved = (event: BeforeUnloadEvent) => {
    if ((dirty.value || fieldDraftDirty.value) && !props.pending) {
        event.preventDefault();
    }
};
onMounted(() => window.addEventListener('beforeunload', unsaved));
onBeforeUnmount(() => window.removeEventListener('beforeunload', unsaved));
watch(
    () => props.pending,
    (value) => editor.value?.setEditable(!value),
);
const fieldCount = computed(() => {
    void toolbarVersion.value;

    return editor.value
        ? nodesOfType(editor.value.getJSON() as DocumentNode, 'field').length
        : 0;
});
defineExpose({ save, editor, markClean, prepareDocument });
</script>

<template>
    <div class="min-h-0">
        <ContextMenu>
            <ContextMenuTrigger as-child>
                <EditorContent
                    :editor="editor"
                    data-page-unit
                    class="template-document-editor overflow-auto rounded-md border border-transparent p-1 focus-within:border-ring"
                    :class="{
                        'template-document-editor-embedded': embedded,
                    }"
                    @pointerdown.capture="preserveContextSelection"
                    @contextmenu.capture="prepareContextMenu"
                />
            </ContextMenuTrigger>
            <TemplateDocumentContextMenu
                v-if="state"
                :editor="state"
                :version="toolbarVersion"
                :context="context"
                :repeat-table="repeatTable"
                :field-types="fieldTypes"
                :variables="variables"
                @clipboard="clipboard"
                @field-presentation="setFieldPresentation"
                @properties="emit('properties')"
                @insert-teacher-field="insertTeacherField"
                @insert-table="insertTable"
                @insert-variable="insertVariable"
            />
        </ContextMenu>

        <div
            v-if="suggestions"
            class="mt-2 flex flex-col gap-1 rounded-md border bg-popover p-2 text-popover-foreground"
            role="listbox"
            aria-label="Variables disponibles"
        >
            <p
                v-if="!suggestions.items.length"
                class="text-sm text-muted-foreground"
            >
                No se encontraron variables.
            </p>
            <Button
                v-for="(item, index) in suggestions.items"
                :key="item.key"
                type="button"
                :variant="selectedSuggestion === index ? 'secondary' : 'ghost'"
                class="justify-start"
                role="option"
                :aria-selected="selectedSuggestion === index"
                @mousedown.prevent
                @click="chooseVariable(item)"
            >
                @{{ item.key }} — {{ item.label }}
            </Button>
        </div>

        <p class="sr-only" aria-live="polite">
            {{ fieldCount }} espacios de contenido.
            {{ dirty ? 'Cambios sin guardar.' : 'Sin cambios pendientes.' }}
        </p>
    </div>
</template>

<style>
.template-document-editor {
    background: white;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    min-width: 580px;
}
.template-document-editor .tiptap {
    min-height: 300px;
    outline: none;
    padding: 12px;
}
.template-document-editor-embedded .tiptap {
    min-height: 1.5em;
    padding: 2px;
}
.template-document-editor p {
    margin: 0 0 8px;
    min-height: 1em;
}
.template-document-editor table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    margin: 10px 0;
}
.template-document-editor td,
.template-document-editor th {
    border: 1px solid var(--document-table-border);
    min-width: 20px;
    padding: 2px 4px;
    vertical-align: top;
    position: relative;
    overflow-wrap: anywhere;
}
.template-document-editor td p,
.template-document-editor th p {
    margin: 0;
}
.template-document-editor [data-cell-text-color] * {
    color: inherit !important;
}
.template-document-editor [data-cell-text-align] p {
    text-align: inherit !important;
}
.template-document-editor [data-cell-bold='true'] * {
    font-weight: 700 !important;
}
.template-document-editor [data-cell-bold='false'] * {
    font-weight: 400 !important;
}
.template-document-editor [data-cell-italic='true'] * {
    font-style: italic !important;
}
.template-document-editor [data-cell-italic='false'] * {
    font-style: normal !important;
}
.template-document-editor .selectedCell::after {
    background: color-mix(in srgb, var(--document-accent) 20%, transparent);
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
}
.template-document-editor .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--document-accent);
    pointer-events: none;
}
.template-document-editor .resize-cursor {
    cursor: col-resize;
}
.template-input-token {
    background: var(--document-field-background);
    outline: 1px dashed var(--document-table-header-strong-background);
    border-radius: 2px;
    padding: 1px 3px;
}
.template-input-token-generic {
    display: none;
}
.template-variable-token {
    background: var(--document-variable-background);
    border-radius: 2px;
    padding: 1px 3px;
}
.template-document-editor ul {
    list-style: disc;
    padding-left: 24px;
}
.template-document-editor ol {
    list-style: decimal;
    padding-left: 24px;
}
</style>
