<script setup lang="ts">
import {
    Braces,
    ChevronDown,
    MessageCircleQuestionMark,
    Plus,
    Rows3,
} from '@lucide/vue';
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
import type { DocumentField, TemplateVariable } from '@/lib/templateDocument';

/*
 * Tres opciones y nada más. Lo propio de Planificación (unidades, horas y
 * totales) viene de fábrica y no se configura aquí.
 */
defineProps<{
    disabled: boolean;
    variables: TemplateVariable[];
    teacherFields: DocumentField[];
    repeatedColumns: TableColumn[];
    canInsertRepeatedColumn: (column: TableColumn) => boolean;
    selectedRowRole: TableRowRole;
    selectedRowHasColumns: boolean;
}>();

const emit = defineEmits<{
    insertVariable: [variable: TemplateVariable];
    insertField: [field: DocumentField];
    newField: [];
    insertRepeatedColumn: [column: TableColumn];
    newData: [];
    rowRole: [value: TableRowRole];
}>();
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                :disabled="disabled"
                aria-label="Insertar en la celda"
            >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Insertar
                <ChevronDown data-icon="inline-end" aria-hidden="true" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
            <DropdownMenuGroup>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Braces />
                        Dato automático
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-72 overflow-y-auto"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="variable in variables"
                                :key="variable.key"
                                @select="emit('insertVariable', variable)"
                            >
                                <span class="truncate">
                                    {{ variable.label }}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <MessageCircleQuestionMark />
                        Pregunta al docente
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-72 overflow-y-auto"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="field in teacherFields"
                                :key="field.key"
                                @select="emit('insertField', field)"
                            >
                                {{ field.label }}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator v-if="teacherFields.length" />
                        <DropdownMenuItem @select="emit('newField')">
                            <Plus />
                            Nueva pregunta…
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Rows3 />
                        Filas que agrega el docente
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-80 overflow-y-auto"
                    >
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
                                    @select="
                                        emit('insertRepeatedColumn', column)
                                    "
                                >
                                    <span class="truncate">
                                        {{ column.label }}
                                    </span>
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
