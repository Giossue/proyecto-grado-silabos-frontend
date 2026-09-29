import { CellSelection } from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import type { CellAttributes } from '@/components/domain/configuration/template-table/types';

type TableCommand =
    | 'mergeCells'
    | 'splitCell'
    | 'addRowBefore'
    | 'addRowAfter'
    | 'addColumnBefore'
    | 'addColumnAfter'
    | 'deleteRow'
    | 'deleteColumn';

export function useTemplateTableSelection(
    editor: ShallowRef<Editor | undefined>,
    version: Ref<number>,
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
    const can = (command: TableCommand) => {
        void version.value;
        const commands = state.value?.can();
        const candidate = commands?.[command];

        return typeof candidate === 'function' ? candidate() : false;
    };

    return { state, selectedCell, inCell, can };
}
