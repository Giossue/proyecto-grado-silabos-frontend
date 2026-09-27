<script setup lang="ts">
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Baseline,
    Bold,
    Eraser,
    Italic,
    Lock,
    PaintBucket,
    Redo2,
    Split,
    Undo2,
    Merge,
} from '@lucide/vue';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import TemplateTableInsertMenu from '@/components/domain/configuration/template-table/TemplateTableInsertMenu.vue';
import TemplateTableNewDataSheet from '@/components/domain/configuration/template-table/TemplateTableNewDataSheet.vue';
import type { NewRepeatedData } from '@/components/domain/configuration/template-table/TemplateTableNewDataSheet.vue';
import TemplateTableRowsMenu from '@/components/domain/configuration/template-table/TemplateTableRowsMenu.vue';
import TemplateTableNewFieldDialog from '@/components/domain/configuration/template-table/TemplateTableNewFieldDialog.vue';
import type { NewTeacherField } from '@/components/domain/configuration/template-table/TemplateTableNewFieldDialog.vue';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import type { CellAlignment } from '@/components/domain/configuration/template-table/types';
import { useTableCellResize } from '@/components/domain/configuration/template-table/useTableCellResize';
import { useTemplateTableActions } from '@/components/domain/configuration/template-table/useTemplateTableActions';
import { useTemplateTableSelection } from '@/components/domain/configuration/template-table/useTemplateTableSelection';
import TemplateToolbarButton from '@/components/domain/configuration/TemplateToolbarButton.vue';
import TemplateToolbarSelect from '@/components/domain/configuration/TemplateToolbarSelect.vue';
import { Button } from '@/components/ui/button';
import { SelectItem } from '@/components/ui/select';
import { useVariableSuggestions } from '@/composables/useVariableSuggestions';
import { Separator } from '@/components/ui/separator';
import type { TableLayout } from '@/lib/tableLayout';
import { tableKeyFor } from '@/lib/tableLayout';
import { pageSpacersPlugin } from '@/lib/editorPageSpacers';
import type {
    DocumentField,
    DocumentNode,
    TemplateVariable,
} from '@/lib/templateDocument';
import { demoteEmptyRepeatedTables, nodesOfType } from '@/lib/templateDocument';

const props = defineProps<{
    document: DocumentNode;
    pending: boolean;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    bodyAlignment: CellAlignment;
    colors: { value: string; label: string }[];
    fields: DocumentField[];
    variables: TemplateVariable[];
    layout?: TableLayout | null;
    toolbarTarget?: string;
}>();

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const editorShell = ref<HTMLElement | null>(null);

const editorStyle = computed<CSSProperties & Record<string, string>>(() => ({
    fontFamily: props.fontFamily,
    fontSize: `${props.fontSize}pt`,
    color: props.textColor,
    '--table-body-alignment': props.bodyAlignment,
}));
const initial = JSON.stringify(props.document);
const version = ref(0);
const newFieldDialog = ref<InstanceType<
    typeof TemplateTableNewFieldDialog
> | null>(null);
const newDataSheet = ref<InstanceType<typeof TemplateTableNewDataSheet> | null>(
    null,
);
const variableLabels = computed(
    () =>
        new Map(props.variables.map((variable) => [variable.key, variable.label])),
);
// «@» dentro de una celda abre la lista de datos automáticos.
const { suggestions, selectedSuggestion, chooseVariable, suggestion } =
    useVariableSuggestions({
        variables: () => props.variables,
        enabled: () => !props.pending,
    });
const suggestionStyle = computed<CSSProperties>(() => {
    const rect = suggestions.value?.clientRect?.();

    return rect
        ? { position: 'fixed', left: `${rect.left}px`, top: `${rect.bottom + 4}px` }
        : { display: 'none' };
});
const editor = useEditor({
    content: props.document,
    editorProps: {
        attributes: {
            'aria-label': 'Editar tabla de la plantilla',
            role: 'textbox',
            'aria-multiline': 'true',
            spellcheck: 'true',
        },
    },
    extensions: [
        ...templateTableExtensions({
            variableLabel: (id) => variableLabels.value.get(id),
            suggestion,
        }),
        // Page breaks between rows drawn by the sheet view; presentation only.
        Extension.create({
            name: 'pageSpacers',
            addProseMirrorPlugins: () => [pageSpacersPlugin()],
        }),
    ],
    onUpdate: ({ editor: current }) => {
        version.value++;
        emit('dirty', JSON.stringify(current.getJSON()) !== initial);
    },
    onSelectionUpdate: () => {
        version.value++;
    },
    onTransaction: () => {
        version.value++;
    },
});

watch(
    () => props.pending,
    (pending) => editor.value?.setEditable(!pending),
);

const { resizeGuide, startCellResize } = useTableCellResize(
    editor,
    editorShell,
    () => props.pending,
);

onBeforeUnmount(() => {
    editor.value?.destroy();
});

const selection = useTemplateTableSelection(editor, version, props);
const {
    state,
    selectedCell,
    inCell,
    selectedRowRole,
    repeatedColumns,
    selectedRowHasColumns,
    usedColumnRoles,
    teacherFields,
    can,
} = selection;
const {
    setRowRole,
    deleteSelectedRow,
    setCell,
    background,
    cellTextColor,
    alignment,
    backgroundTooltip,
    cellTextColorTooltip,
    alignmentTooltip,
    resetCell,
    insertNode,
    convertTableToFixed,
    insertVariable,
    insertField,
    canInsertRepeatedColumn,
    insertRepeatedColumn,
    keyFor,
} = useTemplateTableActions(editor, props, selection);

const openNewData = (): void => {
    if (selectedRowRole.value === 'total') {
        return;
    }

    newDataSheet.value?.open(
        selectedRowRole.value === 'unit' ? 'unit' : 'record',
    );
};

const createRepeatedData = ({
    label,
    type,
    role,
    scope,
}: NewRepeatedData): void => {
    const document =
        (editor.value?.getJSON() as DocumentNode | undefined) ?? props.document;
    const key = tableKeyFor(label, [
        ...repeatedColumns.value.map((column) => column.key),
        ...(props.layout?.header_fields ?? []).map((field) => field.key),
        ...nodesOfType(document, 'column').map((node) =>
            String(node.attrs?.key ?? ''),
        ),
    ]);

    setRowRole(scope);
    insertNode({
        type: 'column',
        attrs: {
            key,
            label,
            kind:
                scope === 'unit' || type === 'text' ? 'texto_largo' : 'numero',
            role: scope === 'record' && role !== 'none' ? role : null,
            sum: false,
        },
    });
};

const openNewField = (): void => {
    newFieldDialog.value?.open();
};

const createField = ({ label, type, options, options_sources }: NewTeacherField): void => {
    insertField({
        key: keyFor(label),
        label,
        type,
        options: options.map((option) => ({ value: option, label: option })),
        options_sources,
        inherited: false,
        teacher_editable: true,
        required: true,
    });
};

const getDocument = (): DocumentNode | null => {
    const document = editor.value?.getJSON() as DocumentNode | undefined;

    return document ? demoteEmptyRepeatedTables(document) : null;
};

defineExpose({ getDocument });
</script>

<template>
    <div
        ref="editorShell"
        class="template-table-editor relative flex min-w-0 flex-col gap-3"
        :style="editorStyle"
        data-page-unit
        :data-resizing="Boolean(resizeGuide) || undefined"
    >
        <div
            v-if="resizeGuide"
            class="pointer-events-none absolute z-30 w-px bg-primary/80"
            :style="{
                left: `${resizeGuide.left}px`,
                top: `${resizeGuide.top}px`,
                height: `${resizeGuide.height}px`,
            }"
            aria-hidden="true"
        />
        <Teleport :to="toolbarTarget ?? 'body'" :disabled="!toolbarTarget">
            <div
                class="flex min-w-max items-center gap-2 text-foreground"
                role="toolbar"
                aria-label="Formato de celdas"
            >
                <TemplateTableInsertMenu
                    :disabled="!inCell || pending"
                    :variables="variables"
                    :teacher-fields="teacherFields"
                    :repeated-columns="repeatedColumns"
                    :can-insert-repeated-column="canInsertRepeatedColumn"
                    :selected-row-role="selectedRowRole"
                    :selected-row-has-columns="selectedRowHasColumns"
                    @insert-variable="insertVariable"
                    @insert-field="insertField($event)"
                    @new-field="openNewField"
                    @insert-repeated-column="insertRepeatedColumn"
                    @new-data="openNewData"
                    @row-role="setRowRole"
                />

                <TemplateToolbarButton
                    label="Hacer texto fijo"
                    tooltip="Hacer texto fijo (el docente no lo llena)"
                    text="Hacer texto fijo"
                    :disabled="!state?.isActive('table') || pending"
                    @click="convertTableToFixed"
                >
                    <Lock aria-hidden="true" />
                </TemplateToolbarButton>

                <Separator orientation="vertical" class="h-7" />

                <TemplateToolbarSelect
                    v-model="background"
                    label="Fondo de celda"
                    :tooltip="backgroundTooltip"
                    :disabled="!inCell || pending"
                >
                    <template #icon>
                        <PaintBucket
                            class="text-foreground"
                            aria-hidden="true"
                        />
                    </template>
                    <SelectItem value="inherit">Sin fondo</SelectItem>
                    <SelectItem
                        v-for="option in colors"
                        :key="`background-${option.value}`"
                        :value="option.value"
                    >
                        <span
                            class="size-3 rounded-sm border"
                            :style="{ backgroundColor: option.value }"
                            aria-hidden="true"
                        />
                        {{ option.label }}
                    </SelectItem>
                </TemplateToolbarSelect>

                <TemplateToolbarSelect
                    v-model="cellTextColor"
                    label="Color de fuente"
                    :tooltip="cellTextColorTooltip"
                    :disabled="!inCell || pending"
                >
                    <template #icon>
                        <Baseline class="text-foreground" aria-hidden="true" />
                    </template>
                    <SelectItem value="inherit">Predeterminado</SelectItem>
                    <SelectItem
                        v-for="option in colors"
                        :key="`text-${option.value}`"
                        :value="option.value"
                    >
                        <span
                            class="size-3 rounded-sm border"
                            :style="{ backgroundColor: option.value }"
                            aria-hidden="true"
                        />
                        {{ option.label }}
                    </SelectItem>
                </TemplateToolbarSelect>

                <TemplateToolbarSelect
                    v-model="alignment"
                    label="Alineación de celda"
                    :tooltip="alignmentTooltip"
                    :disabled="!inCell || pending"
                >
                    <template #icon>
                        <AlignLeft class="text-foreground" aria-hidden="true" />
                    </template>
                    <SelectItem value="inherit">Predeterminada</SelectItem>
                    <SelectItem value="left">
                        <AlignLeft /> Izquierda
                    </SelectItem>
                    <SelectItem value="center">
                        <AlignCenter /> Centro
                    </SelectItem>
                    <SelectItem value="right">
                        <AlignRight /> Derecha
                    </SelectItem>
                    <SelectItem value="justify">
                        <AlignJustify /> Justificado
                    </SelectItem>
                </TemplateToolbarSelect>

                <Separator orientation="vertical" class="h-7" />

                <TemplateToolbarButton
                    label="Negrita en las celdas seleccionadas"
                    tooltip="Negrita"
                    :variant="
                        selectedCell.bold === true ? 'secondary' : 'ghost'
                    "
                    :disabled="!inCell || pending"
                    :pressed="selectedCell.bold === true"
                    @click="
                        setCell(
                            'bold',
                            selectedCell.bold === true ? false : true,
                        )
                    "
                >
                    <Bold aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton
                    label="Cursiva en las celdas seleccionadas"
                    tooltip="Cursiva"
                    :variant="
                        selectedCell.italic === true ? 'secondary' : 'ghost'
                    "
                    :disabled="!inCell || pending"
                    :pressed="selectedCell.italic === true"
                    @click="
                        setCell(
                            'italic',
                            selectedCell.italic === true ? false : true,
                        )
                    "
                >
                    <Italic aria-hidden="true" />
                </TemplateToolbarButton>

                <Separator orientation="vertical" class="h-7" />

                <TemplateToolbarButton
                    label="Combinar celdas"
                    text="Combinar"
                    :disabled="!can('mergeCells') || pending"
                    @click="state?.chain().focus().mergeCells().run()"
                >
                    <Merge aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton
                    label="Separar celda"
                    text="Separar"
                    :disabled="!can('splitCell') || pending"
                    @click="state?.chain().focus().splitCell().run()"
                >
                    <Split aria-hidden="true" />
                </TemplateToolbarButton>

                <TemplateTableRowsMenu
                    :state="state"
                    :disabled="!inCell || pending"
                    :can="can"
                    @delete-row="deleteSelectedRow"
                />

                <TemplateToolbarButton
                    label="Quitar estilo de celda"
                    :disabled="!inCell || pending"
                    @click="resetCell"
                >
                    <Eraser aria-hidden="true" />
                </TemplateToolbarButton>

                <div class="ms-auto flex gap-1">
                    <TemplateToolbarButton
                        label="Deshacer"
                        :disabled="!state?.can().undo() || pending"
                        @click="state?.chain().focus().undo().run()"
                    >
                        <Undo2 aria-hidden="true" />
                    </TemplateToolbarButton>
                    <TemplateToolbarButton
                        label="Rehacer"
                        :disabled="!state?.can().redo() || pending"
                        @click="state?.chain().focus().redo().run()"
                    >
                        <Redo2 aria-hidden="true" />
                    </TemplateToolbarButton>
                </div>
            </div>
        </Teleport>

        <EditorContent
            :editor="editor"
            class="template-table-canvas min-w-0 overflow-x-clip"
            @mousedown.capture="startCellResize"
        />

        <Teleport to="body">
            <div
                v-if="suggestions"
                class="z-50 flex max-h-72 w-72 flex-col gap-1 overflow-y-auto rounded-md border bg-popover p-1.5 text-popover-foreground shadow-md"
                :style="suggestionStyle"
                role="listbox"
                aria-label="Datos automáticos"
            >
                <p
                    v-if="!suggestions.items.length"
                    class="px-2 py-1.5 text-sm text-muted-foreground"
                >
                    No hay datos automáticos con ese nombre.
                </p>
                <Button
                    v-for="(item, index) in suggestions.items"
                    :key="item.key"
                    type="button"
                    size="sm"
                    :variant="
                        selectedSuggestion === index ? 'secondary' : 'ghost'
                    "
                    class="justify-start"
                    role="option"
                    :aria-selected="selectedSuggestion === index"
                    @mousedown.prevent
                    @click="chooseVariable(item)"
                >
                    <span class="truncate">{{ item.label }}</span>
                </Button>
            </div>
        </Teleport>
    </div>

    <TemplateTableNewDataSheet
        ref="newDataSheet"
        :used-column-roles="usedColumnRoles"
        @create="createRepeatedData"
    />

    <TemplateTableNewFieldDialog ref="newFieldDialog" :variables="variables" @create="createField" />
</template>

<style>
.template-table-editor .tiptap {
    min-width: 0;
    width: 100%;
    outline: none;
}
.template-table-editor .tableWrapper {
    min-width: 0;
    width: 100%;
}
.template-table-editor .template-table-canvas {
    /* La hoja ya pinta el papel; un fondo propio taparía el hueco entre hojas
       cuando la tabla se parte por filas. */
    background: transparent;
}
.template-table-editor table {
    border-collapse: collapse;
    /* auto: los anchos son preferencias y una columna crece lo justo para que una
       palabra corta (Semana, APE) no se parta. */
    table-layout: auto;
    width: 100% !important;
}
.template-table-editor td,
.template-table-editor th {
    border: 1px solid var(--document-table-border);
    cursor: text;
    min-width: 20px;
    padding: 2px 4px;
    position: relative;
    vertical-align: top;
    /* Las celdas no desbordan: sílabas con guion y, si no alcanza, corte. */
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
    -webkit-hyphens: auto;
    /* Solo se silabean palabras de 8+ letras. */
    hyphenate-limit-chars: 8 4 4;
}
.template-table-editor td *,
.template-table-editor th * {
    font-family: inherit !important;
    font-size: inherit !important;
}
.template-table-editor td p,
.template-table-editor th p {
    margin: 0;
    min-height: 1em;
}
.template-table-editor td:not([data-cell-text-align]) p,
.template-table-editor th:not([data-cell-text-align]) p {
    text-align: var(--table-body-alignment) !important;
}
.template-table-editor [data-cell-text-color] * {
    color: inherit !important;
}
.template-table-editor [data-cell-text-align] p {
    text-align: inherit !important;
}
.template-table-editor [data-cell-bold='true'] * {
    font-weight: 700 !important;
}
.template-table-editor [data-cell-bold='false'] * {
    font-weight: 400 !important;
}
.template-table-editor [data-cell-italic='true'] * {
    font-style: italic !important;
}
.template-table-editor [data-cell-italic='false'] * {
    font-style: normal !important;
}
.template-table-editor .selectedCell::after {
    background: color-mix(in srgb, var(--document-accent) 20%, transparent);
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
}
.template-table-editor td:not(:last-child)::before,
.template-table-editor th:not(:last-child)::before {
    background: var(--document-accent);
    bottom: 0;
    content: '';
    cursor: col-resize;
    opacity: 0;
    position: absolute;
    right: -0.5px;
    top: 0;
    transition: opacity 120ms ease;
    width: 1px;
    z-index: 20;
}
.template-table-editor td:not(:last-child):hover::before,
.template-table-editor th:not(:last-child):hover::before {
    opacity: 1;
}
.template-table-editor[data-resizing] td:not(:last-child)::before,
.template-table-editor[data-resizing] th:not(:last-child)::before {
    display: none;
}
.template-table-editor .template-table-field {
    background: var(--document-field-background);
    border-radius: 2px;
    color: var(--document-editor-foreground) !important;
    outline: 1px dashed var(--document-table-header-strong-background);
    padding: 1px 3px;
}
.template-table-editor .template-table-variable {
    background: var(--document-variable-background);
    border-radius: 2px;
    color: var(--document-editor-foreground) !important;
    padding: 1px 3px;
}
.template-table-editor .tiptap .template-table-field,
.template-table-editor .tiptap .template-table-variable {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
    white-space: nowrap;
}
</style>
