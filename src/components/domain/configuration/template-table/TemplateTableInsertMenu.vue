<script setup lang="ts">
import {
    Braces,
    ChevronDown,
    CircleHelp,
    FileText,
    Plus,
    Rows3,
    UserPen,
} from '@lucide/vue';
import { computed } from 'vue';
import { PROJECT_PREFIX } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import type { TableRowRole } from '@/components/domain/configuration/template-table/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TableColumn } from '@/lib/tableLayout';
import type { TemplateVariable } from '@/lib/templateDocument';

/*
 * Las marcas de la hoja (I-155) se ponen sin preguntas: su nombre sale del contexto.
 * Dentro de una tabla se agregan las filas que agrega el docente. Lo propio de
 * Planificación (unidades, horas y totales) viene de fábrica y no se configura aquí.
 */
const props = defineProps<{
    disabled: boolean;
    inTable: boolean;
    variables: TemplateVariable[];
    repeatedColumns: TableColumn[];
    canInsertRepeatedColumn: (column: TableColumn) => boolean;
    selectedRowRole: TableRowRole;
    selectedRowHasColumns: boolean;
}>();

const emit = defineEmits<{
    insertVariable: [variable: TemplateVariable];
    teacher: [];
    yesNo: [];
    project: [];
    insertRepeatedColumn: [column: TableColumn];
    newData: [];
    rowRole: [value: TableRowRole];
}>();

const automatic = computed(() => props.variables.filter((variable) => !variable.key.startsWith(PROJECT_PREFIX)));
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                :disabled="disabled"
                aria-label="Insertar en la hoja"
            >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Insertar
                <ChevronDown data-icon="inline-end" aria-hidden="true" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-72">
            <DropdownMenuGroup>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Braces />
                        Dato automático
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="max-h-80 w-72 overflow-y-auto">
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="variable in automatic"
                                :key="variable.key"
                                @select="emit('insertVariable', variable)"
                            >
                                <span class="truncate">{{ variable.label }}</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem @select="emit('teacher')">
                    <UserPen />
                    Docente
                </DropdownMenuItem>
                <DropdownMenuItem @select="emit('yesNo')">
                    <CircleHelp />
                    Docente: Sí o No
                </DropdownMenuItem>
                <DropdownMenuItem @select="emit('project')">
                    <FileText />
                    Proyecto de carrera
                </DropdownMenuItem>

                <DropdownMenuSub v-if="inTable">
                    <DropdownMenuSubTrigger>
                        <Rows3 />
                        Filas que agrega el docente
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="max-h-80 w-80 overflow-y-auto">
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-if="selectedRowRole === 'fixed'"
                                @select="emit('rowRole', 'record')"
                            >
                                El docente repite esta fila
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                v-else-if="selectedRowRole === 'record'"
                                :disabled="selectedRowHasColumns"
                                @select="emit('rowRole', 'fixed')"
                            >
                                Esta fila ya no la repite el docente
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <template v-if="selectedRowRole !== 'fixed'">
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    v-for="column in repeatedColumns"
                                    :key="column.key"
                                    :disabled="!canInsertRepeatedColumn(column)"
                                    @select="emit('insertRepeatedColumn', column)"
                                >
                                    <span class="truncate">{{ column.label }}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    :disabled="selectedRowRole === 'total'"
                                    @select="emit('newData')"
                                >
                                    <Plus />
                                    Nuevo dato que llena el docente…
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </template>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
