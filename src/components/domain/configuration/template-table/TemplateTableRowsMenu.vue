<script setup lang="ts">
import { ChevronDown, Columns3, Lock, Rows3 } from '@lucide/vue';
import type { Editor } from '@tiptap/vue-3';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

type TableCommand =
    | 'addRowBefore'
    | 'addRowAfter'
    | 'addColumnBefore'
    | 'addColumnAfter'
    | 'deleteRow'
    | 'deleteColumn';

defineProps<{
    state: Editor | undefined;
    disabled: boolean;
    can: (command: TableCommand) => boolean;
}>();

const emit = defineEmits<{
    deleteRow: [];
}>();

const tableMenuHelpOpen = ref(false);

/**
 * Convierte la tabla seleccionada en contenido fijo: quita los campos y
 * columnas del docente, la repetición por unidad y marca todas las filas como
 * fijas. Todo va en una sola transacción para poder deshacerlo de una vez.
 */
const convertToFixed = (editor: Editor | undefined): void => {
    if (!editor) {
        return;
    }

    const { state, view } = editor;
    const { $from } = state.selection;
    let depth = $from.depth;

    while (depth > 0 && $from.node(depth).type.name !== 'table') {
        depth--;
    }

    if (depth === 0) {
        return;
    }

    const table = $from.node(depth);
    const tablePos = $from.before(depth);
    const tr = state.tr;
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
</script>

<template>
    <Tooltip v-model:open="tableMenuHelpOpen">
        <TooltipTrigger as-child>
            <span class="inline-flex">
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            :disabled="disabled"
                            aria-label="Filas y columnas"
                            @focus="tableMenuHelpOpen = true"
                            @blur="tableMenuHelpOpen = false"
                        >
                            <Rows3
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                            Filas y columnas
                            <ChevronDown
                                data-icon="inline-end"
                                aria-hidden="true"
                            />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                :disabled="!can('addRowBefore')"
                                @select="
                                    state?.chain().focus().addRowBefore().run()
                                "
                            >
                                <Rows3 /> Fila arriba
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                :disabled="!can('addRowAfter')"
                                @select="
                                    state?.chain().focus().addRowAfter().run()
                                "
                            >
                                <Rows3 /> Fila abajo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                :disabled="!can('addColumnBefore')"
                                @select="
                                    state
                                        ?.chain()
                                        .focus()
                                        .addColumnBefore()
                                        .run()
                                "
                            >
                                <Columns3 /> Columna izquierda
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                :disabled="!can('addColumnAfter')"
                                @select="
                                    state
                                        ?.chain()
                                        .focus()
                                        .addColumnAfter()
                                        .run()
                                "
                            >
                                <Columns3 /> Columna derecha
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                variant="destructive"
                                :disabled="!can('deleteRow')"
                                @select="emit('deleteRow')"
                            >
                                Eliminar fila
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                :disabled="!can('deleteColumn')"
                                @select="
                                    state?.chain().focus().deleteColumn().run()
                                "
                            >
                                Eliminar columna
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            :disabled="!state?.isActive('table')"
                            @select="convertToFixed(state)"
                        >
                            <Lock /> Convertir en contenido fijo (el docente no
                            llena)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </span>
        </TooltipTrigger>
        <TooltipContent>Filas y columnas</TooltipContent>
    </Tooltip>
</template>
