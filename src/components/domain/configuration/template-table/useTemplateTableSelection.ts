import { CellSelection } from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import type {
    CellAttributes,
    TableRowRole,
} from '@/components/domain/configuration/template-table/types';
import type {
    TableColumn,
    TableColumnRole,
    TableLayout,
} from '@/lib/tableLayout';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import { nodesOfType } from '@/lib/templateDocument';

export type TemplateTableSource = {
    document: DocumentNode;
    fields: DocumentField[];
    layout?: TableLayout | null;
};

type TableCommand =
    | 'mergeCells'
    | 'splitCell'
    | 'addRowBefore'
    | 'addRowAfter'
    | 'addColumnBefore'
    | 'addColumnAfter'
    | 'deleteRow'
    | 'deleteColumn';

/** Lee la celda, fila y tabla seleccionadas y los datos que ofrece el menú Insertar. */
export function useTemplateTableSelection(
    editor: ShallowRef<Editor | undefined>,
    version: Ref<number>,
    props: TemplateTableSource,
) {
    const state = computed(() => {
        void version.value;

        return editor.value;
    });

    const selectedCell = computed<CellAttributes>(() => {
        const current = state.value;

        if (!current) {
            return {};
        }

        const selection = current.state.selection;

        if (selection instanceof CellSelection) {
            return selection.$anchorCell.nodeAfter?.attrs ?? {};
        }

        for (let depth = selection.$from.depth; depth > 0; depth--) {
            const node = selection.$from.node(depth);

            if (['tableCell', 'tableHeader'].includes(node.type.name)) {
                return node.attrs;
            }
        }

        return {};
    });

    const inCell = computed(() => Object.keys(selectedCell.value).length > 0);
    const ancestorAttributes = (type: 'table' | 'tableRow') => {
        const current = state.value;

        if (!current) {
            return null;
        }

        const { $from } = current.state.selection;

        for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);

            if (node.type.name === type) {
                return node.attrs as Record<string, unknown>;
            }
        }

        return null;
    };
    const selectedRowRole = computed<TableRowRole>(() => {
        void version.value;

        const role = ancestorAttributes('tableRow')?.rowRole;

        return ['record', 'unit', 'total'].includes(String(role))
            ? (role as TableRowRole)
            : 'fixed';
    });
    const groupedByUnit = computed(() => {
        void version.value;

        const value = ancestorAttributes('table')?.groupByUnit;

        return typeof value === 'boolean'
            ? value
            : Boolean(props.layout?.repeat.enabled);
    });
    const repeatField = computed(() =>
        props.fields.find((field) => field.type === 'repetible'),
    );
    const repeatedColumns = computed<TableColumn[]>(() => {
        void version.value;

        const columns = new Map(
            (props.layout?.columns ?? []).map((column) => [column.key, column]),
        );
        const document =
            (editor.value?.getJSON() as DocumentNode | undefined) ??
            props.document;

        for (const row of nodesOfType(document, 'tableRow')) {
            if (!['record', 'total'].includes(String(row.attrs?.rowRole))) {
                continue;
            }

            for (const node of nodesOfType(row, 'column')) {
                const key = String(node.attrs?.key ?? '');

                if (!key || columns.has(key)) {
                    continue;
                }

                columns.set(key, {
                    key,
                    label: String(node.attrs?.label ?? key),
                    type: node.attrs?.kind === 'numero' ? 'number' : 'text',
                    group: null,
                    band: null,
                    sum: Boolean(node.attrs?.sum),
                    width: null,
                    role: (node.attrs?.role as TableColumnRole | null) ?? null,
                });
            }
        }

        return [...columns.values()];
    });
    const selectedRowHasColumns = computed(() => {
        void version.value;

        const current = state.value;

        if (!current) {
            return false;
        }

        const { $from } = current.state.selection;

        for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);

            if (node.type.name === 'tableRow') {
                return (
                    nodesOfType(node.toJSON() as DocumentNode, 'column')
                        .length > 0
                );
            }
        }

        return false;
    });
    const usedColumnRoles = computed(
        () =>
            new Set(
                repeatedColumns.value
                    .map((column) => column.role)
                    .filter((role): role is TableColumnRole => role !== null),
            ),
    );
    const teacherFields = computed(() => {
        void version.value;
        const byKey = new Map(
            props.fields
                .filter(
                    (field) =>
                        field.teacher_editable !== false &&
                        !field.inherited &&
                        !['repetible', 'flujo', 'referencia_maestra'].includes(
                            field.type ?? '',
                        ),
                )
                .map((field) => [field.key, field]),
        );

        for (const node of nodesOfType(
            (editor.value?.getJSON() as DocumentNode | undefined) ??
                props.document,
            'field',
        )) {
            const key = String(node.attrs?.key ?? '');

            if (!key || byKey.has(key)) {
                continue;
            }

            const rawOptions = node.attrs?.options;
            byKey.set(key, {
                key,
                label: String(node.attrs?.label ?? key),
                type: String(node.attrs?.kind ?? 'texto_largo'),
                options: Array.isArray(rawOptions)
                    ? rawOptions.map((option) => ({
                          value: String(option),
                          label: String(option),
                      }))
                    : [],
                inherited: false,
                teacher_editable: true,
                required: true,
            });
        }

        return [...byKey.values()];
    });
    const conditionalChoices = computed(() =>
        teacherFields.value.flatMap((field) =>
            (field.options ?? []).map((option) => ({ field, option })),
        ),
    );
    const can = (command: TableCommand) => {
        void version.value;
        const commands = state.value?.can();
        const candidate = commands?.[command];

        return typeof candidate === 'function' ? candidate() : false;
    };

    return {
        state,
        selectedCell,
        inCell,
        ancestorAttributes,
        selectedRowRole,
        groupedByUnit,
        repeatField,
        repeatedColumns,
        selectedRowHasColumns,
        usedColumnRoles,
        teacherFields,
        conditionalChoices,
        can,
    };
}
