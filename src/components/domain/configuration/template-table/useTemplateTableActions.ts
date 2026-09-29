import { CellSelection } from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import type { ShallowRef } from 'vue';
import type {
    CellAlignment,
    CellAttributes,
} from '@/components/domain/configuration/template-table/types';
import type { useTemplateTableSelection } from '@/components/domain/configuration/template-table/useTemplateTableSelection';
import type {
    DocumentField,
    DocumentNode,
    TemplateVariable,
} from '@/lib/templateDocument';
import { nodesOfType } from '@/lib/templateDocument';

type TemplateTableActionSource = {
    document: DocumentNode;
    pending: boolean;
    colors: { value: string; label: string }[];
    fields: DocumentField[];
};

export function useTemplateTableActions(
    editor: ShallowRef<Editor | undefined>,
    props: TemplateTableActionSource,
    selection: ReturnType<typeof useTemplateTableSelection>,
) {
    const { state, selectedCell } = selection;

    const deleteSelectedRow = (): void => {
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

    const insertNode = (node: DocumentNode): void => {
        const current = state.value;

        if (!current || props.pending) {
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

    const insertVariable = (variable: TemplateVariable): void =>
        insertNode({
            type: 'variable',
            attrs: { id: variable.key, label: variable.label },
        });

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
        insertVariable,
        keyFor,
    };
}
