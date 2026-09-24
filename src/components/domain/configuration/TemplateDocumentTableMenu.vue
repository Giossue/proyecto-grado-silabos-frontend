<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3';
import { computed } from 'vue';
import {
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { DOCUMENT_CELL_COLORS, DOCUMENT_COLORS } from '@/lib/documentPalette';

const props = defineProps<{
    editor: Editor;
    version: number;
    repeatTable?: string | null;
}>();
const state = computed(() => {
    void props.version;

    return props.editor;
});
const cellColors = DOCUMENT_CELL_COLORS;
</script>

<template>
    <ContextMenuGroup>
        <ContextMenuSub>
            <ContextMenuSubTrigger>Insertar</ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        @select="state.chain().focus().addColumnBefore().run()"
                    >
                        Columna izquierda
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="state.chain().focus().addColumnAfter().run()"
                    >
                        Columna derecha
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="state.chain().focus().addRowBefore().run()"
                    >
                        Fila arriba
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="state.chain().focus().addRowAfter().run()"
                    >
                        Fila debajo
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
            <ContextMenuSubTrigger>Eliminar</ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        variant="destructive"
                        @select="state.chain().focus().deleteColumn().run()"
                    >
                        Eliminar columna
                    </ContextMenuItem>
                    <ContextMenuItem
                        variant="destructive"
                        @select="state.chain().focus().deleteRow().run()"
                    >
                        Eliminar fila
                    </ContextMenuItem>
                    <ContextMenuItem
                        variant="destructive"
                        @select="state.chain().focus().deleteTable().run()"
                    >
                        Eliminar tabla
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem
            :disabled="!state.can().mergeCells()"
            @select="state.chain().focus().mergeCells().run()"
        >
            Unir celdas
        </ContextMenuItem>
        <ContextMenuItem
            :disabled="!state.can().splitCell()"
            @select="state.chain().focus().splitCell().run()"
        >
            Dividir celda
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger> Fondo de celda </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        v-for="color in cellColors"
                        :key="color.label"
                        @select="
                            state
                                .chain()
                                .focus()
                                .setCellAttribute(
                                    'backgroundColor',
                                    color.value,
                                )
                                .run()
                        "
                    >
                        <span
                            class="size-3 rounded-sm border"
                            :style="{
                                backgroundColor:
                                    color.value ?? DOCUMENT_COLORS.paper,
                            }"
                        />
                        {{ color.label }}
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub v-if="repeatTable">
            <ContextMenuSubTrigger> Función de la fila </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuGroup>
                    <ContextMenuItem
                        @select="
                            state
                                .chain()
                                .focus()
                                .updateAttributes('tableRow', {
                                    rowRole: 'fixed',
                                })
                                .run()
                        "
                    >
                        Texto fijo
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state
                                .chain()
                                .focus()
                                .updateAttributes('tableRow', {
                                    rowRole: 'record',
                                })
                                .run()
                        "
                    >
                        Datos que se repiten
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state
                                .chain()
                                .focus()
                                .updateAttributes('tableRow', {
                                    rowRole: 'unit',
                                })
                                .run()
                        "
                    >
                        Datos de la unidad
                    </ContextMenuItem>
                    <ContextMenuItem
                        @select="
                            state
                                .chain()
                                .focus()
                                .updateAttributes('tableRow', {
                                    rowRole: 'total',
                                })
                                .run()
                        "
                    >
                        Totales automáticos
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuSubContent>
        </ContextMenuSub>
    </ContextMenuGroup>
</template>
