import { CellSelection } from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import type { ShallowRef } from 'vue';
import type {
    CellAlignment,
    CellAttributes,
    TableRowRole,
} from '@/components/domain/configuration/template-table/types';
import type { useTemplateTableSelection } from '@/components/domain/configuration/template-table/useTemplateTableSelection';
import type { TableColumn } from '@/lib/tableLayout';
import type {
    DocumentField,
    DocumentNode,
    TemplateVariable,
} from '@/lib/templateDocument';
import { documentFieldOptions, documentOptionsSources, nodesOfType } from '@/lib/templateDocument';

type TemplateTableActionSource = {
    document: DocumentNode;
    pending: boolean;
    colors: { value: string; label: string }[];
    fields: DocumentField[];
};

/** Aplica formato, estructura de filas e inserciones sobre la tabla seleccionada. */
export function useTemplateTableActions(
    editor: ShallowRef<Editor | undefined>,
    props: TemplateTableActionSource,
    selection: ReturnType<typeof useTemplateTableSelection>,
) {
    const {
        state,
        selectedCell,
        inCell,
        ancestorAttributes,
        selectedRowRole,
        selectedRowHasColumns,
        repeatField,
    } = selection;

    const setAncestorAttribute = (
        type: 'table' | 'tableRow',
        attribute: string,
        value: unknown,
    ): void => {
        const current = state.value;

        if (!current) {
            return;
        }

        const { $from } = current.state.selection;

        for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name !== type) {
                continue;
            }

            current.view.dispatch(
                current.state.tr.setNodeAttribute(
                    $from.before(depth),
                    attribute,
                    value,
                ),
            );
            current.commands.focus();

            return;
        }
    };

    const enableRepeatedTable = (): boolean => {
        const table = ancestorAttributes('table');
        const configuredKey = table?.repeatKey;
        const key =
            typeof configuredKey === 'string' && configuredKey !== ''
                ? configuredKey
                : (repeatField.value?.key ?? keyFor('Datos repetibles'));

        setAncestorAttribute('table', 'repeatKey', key);

        if (!repeatField.value && !table?.repeatLabel) {
            setAncestorAttribute('table', 'repeatLabel', 'Datos repetibles');
        }

        setAncestorAttribute('table', 'visualStructure', true);

        return true;
    };

    const setRowRole = (value: unknown): void => {
        if (!['fixed', 'record', 'unit', 'total'].includes(String(value))) {
            return;
        }

        const role = value as TableRowRole;

        if (
            role === 'fixed' &&
            selectedRowRole.value !== 'fixed' &&
            selectedRowHasColumns.value
        ) {
            return;
        }

        if (role !== 'fixed' && !enableRepeatedTable()) {
            return;
        }

        if (role === 'fixed') {
            setAncestorAttribute('table', 'visualStructure', true);
        }

        setAncestorAttribute('tableRow', 'rowRole', role);
    };

    const deleteSelectedRow = (): void => {
        setAncestorAttribute('table', 'visualStructure', true);
        state.value?.chain().focus().deleteRow().run();
    };

    const setCell = (attribute: keyof CellAttributes, value: unknown): void => {
        state.value?.chain().focus().setCellAttribute(attribute, value).run();
    };

    const nullableModel = <T extends string>(attribute: keyof CellAttributes) =>
        computed({
            get: () => String(selectedCell.value[attribute] ?? 'inherit'),
            set: (value: string) =>
                setCell(attribute, value === 'inherit' ? null : (value as T)),
        });

    const background = nullableModel<string>('backgroundColor');
    const cellTextColor = nullableModel<string>('textColor');
    const alignment = nullableModel<CellAlignment>('textAlign');
    const colorName = (value: string, fallback: string): string =>
        value === 'inherit'
            ? fallback
            : (props.colors.find((option) => option.value === value)?.label ??
              value);

    const backgroundTooltip = computed(
        () => `Fondo de celda: ${colorName(background.value, 'Sin fondo')}`,
    );
    const cellTextColorTooltip = computed(
        () =>
            `Color de fuente: ${colorName(cellTextColor.value, 'Predeterminado')}`,
    );
    const alignmentTooltip = computed(() => {
        const labels: Record<string, string> = {
            inherit: 'Predeterminada',
            left: 'Izquierda',
            center: 'Centro',
            right: 'Derecha',
            justify: 'Justificada',
        };

        return `Alineación de celda: ${labels[alignment.value] ?? alignment.value}`;
    });
    const resetCell = (): void => {
        const chain = state.value?.chain().focus();

        chain
            ?.setCellAttribute('backgroundColor', null)
            .setCellAttribute('textColor', null)
            .setCellAttribute('textAlign', null)
            .setCellAttribute('bold', null)
            .setCellAttribute('italic', null)
            .run();
    };

    /**
     * Lo insertado queda después de lo seleccionado; nunca lo reemplaza. Con
     * varias celdas marcadas, entra al final de la última.
     */
    const insertNode = (node: DocumentNode): void => {
        const current = state.value;

        if (!current || !inCell.value || props.pending) {
            return;
        }

        const { selection } = current.state;
        let position = selection.to;

        if (selection instanceof CellSelection) {
            const cell = selection.$headCell.nodeAfter;

            position = cell
                ? selection.$headCell.pos + cell.nodeSize - 2
                : selection.to;
        }

        current
            .chain()
            .focus()
            .setTextSelection(position)
            .insertContent(node)
            .run();
    };

    /**
     * Convierte la tabla seleccionada en texto fijo: quita lo que llena el
     * docente y deja todas las filas fijas. Es un solo paso para poder
     * deshacerlo de una vez.
     */
    const convertTableToFixed = (): void => {
        const current = state.value;

        if (!current) {
            return;
        }

        const { state: editorState, view } = current;
        const { $from } = editorState.selection;
        let depth = $from.depth;

        while (depth > 0 && $from.node(depth).type.name !== 'table') {
            depth--;
        }

        if (depth === 0) {
            return;
        }

        const table = $from.node(depth);
        const tablePos = $from.before(depth);
        const tr = editorState.tr;
        const removals: { from: number; to: number }[] = [];

        table.descendants((node, offset) => {
            const pos = tablePos + 1 + offset;

            if (node.type.name === 'field' || node.type.name === 'column') {
                removals.push({ from: pos, to: pos + node.nodeSize });
            } else if (node.type.name === 'tableRow') {
                tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    rowRole: 'fixed',
                });
            }
        });
        tr.setNodeMarkup(tablePos, undefined, {
            ...table.attrs,
            repeatKey: null,
            repeatLabel: null,
            groupByUnit: null,
            visualStructure: null,
        });

        // Borrar de atrás hacia adelante mantiene válidas las posiciones previas.
        for (const range of removals.reverse()) {
            tr.delete(range.from, range.to);
        }

        view.dispatch(tr);
    };

    const insertVariable = (variable: TemplateVariable): void =>
        insertNode({
            type: 'variable',
            attrs: { id: variable.key, label: variable.label },
        });

    const insertField = (
        field: DocumentField,
        choice: string | null = null,
    ): void =>
        insertNode({
            type: 'field',
            attrs: {
                key: field.key,
                label: field.label,
                kind: field.type ?? 'texto_largo',
                choice,
                options: documentFieldOptions(field),
                options_source: documentOptionsSources(field).length === 1 ? documentOptionsSources(field)[0] : null,
                options_sources: documentOptionsSources(field),
                listStyle: null,
            },
        });

    /** Un total solo suma números: un dato de texto ahí quedaría siempre vacío. */
    const canInsertRepeatedColumn = (column: TableColumn): boolean =>
        selectedRowRole.value === 'record' ||
        (selectedRowRole.value === 'total' && column.type === 'number');

    const insertRepeatedColumn = (column: TableColumn): void => {
        if (!canInsertRepeatedColumn(column)) {
            return;
        }

        enableRepeatedTable();
        insertNode({
            type: 'column',
            attrs: {
                key: column.key,
                label: column.label,
                kind: column.type === 'number' ? 'numero' : 'texto_largo',
                role: column.role ?? null,
                sum: selectedRowRole.value === 'total' || Boolean(column.sum),
            },
        });
    };

    const keyFor = (label: string): string => {
        const base = label
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80);
        const used = new Set([
            ...props.fields.map((field) => field.key),
            ...nodesOfType(
                (editor.value?.getJSON() as DocumentNode | undefined) ??
                    props.document,
                'table',
            ).map((node) => String(node.attrs?.repeatKey ?? '')),
            ...nodesOfType(
                (editor.value?.getJSON() as DocumentNode | undefined) ??
                    props.document,
                'field',
            ).map((node) => String(node.attrs?.key ?? '')),
        ]);
        const unique = globalThis.crypto
            .randomUUID()
            .replaceAll('-', '')
            .slice(0, 8);
        const root = `campo_${base || 'respuesta'}_${unique}`;
        let candidate = root;
        let suffix = 2;

        while (used.has(candidate)) {
            candidate = `${root}_${suffix++}`;
        }

        return candidate;
    };

    return {
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
    };
}
