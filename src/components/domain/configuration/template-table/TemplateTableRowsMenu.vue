<script setup lang="ts">
import { ChevronDown, Columns3, Rows3 } from '@lucide/vue';
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
                    </DropdownMenuContent>
                </DropdownMenu>
            </span>
        </TooltipTrigger>
        <TooltipContent>Filas y columnas</TooltipContent>
    </Tooltip>
</template>
