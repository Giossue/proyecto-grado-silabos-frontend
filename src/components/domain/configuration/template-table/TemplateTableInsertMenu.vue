<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui';
import {
    BadgeCheck,
    Braces,
    ChevronDown,
    Database,
    Plus,
    Rows3,
    UserRoundPlus,
} from '@lucide/vue';
import type { TableRowRole } from '@/components/domain/configuration/template-table/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TableColumn } from '@/lib/tableLayout';
import type { DocumentField, TemplateVariable } from '@/lib/templateDocument';

defineProps<{
    disabled: boolean;
    variables: TemplateVariable[];
    teacherFields: DocumentField[];
    conditionalChoices: {
        field: DocumentField;
        option: { value: string; label: string };
    }[];
    repeatedColumns: TableColumn[];
    canInsertRepeatedColumn: (column: TableColumn) => boolean;
    selectedRowRole: TableRowRole;
    selectedRowHasColumns: boolean;
    groupedByUnit: boolean;
}>();

const emit = defineEmits<{
    insertVariable: [variable: TemplateVariable];
    insertField: [field: DocumentField, choice: string | null];
    newField: [];
    insertRepeatedColumn: [column: TableColumn];
    newData: [];
    groupedByUnit: [value: boolean];
    rowRole: [value: AcceptableValue];
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
                aria-label="Insertar contenido en la celda"
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
                                <span class="min-w-0">
                                    <span class="block truncate font-medium">
                                        {{ variable.label }}
                                    </span>
                                    <span
                                        class="block truncate text-xs text-muted-foreground"
                                    >
                                        @{{ variable.key }}
                                    </span>
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <UserRoundPlus />
                        Campo del docente
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-72 overflow-y-auto"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="field in teacherFields"
                                :key="field.key"
                                @select="emit('insertField', field, null)"
                            >
                                {{ field.label }}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                v-if="teacherFields.length === 0"
                                disabled
                            >
                                Aún no hay campos
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem @select="emit('newField')">
                            <Plus />
                            Nuevo campo…
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <BadgeCheck />
                        Marca condicional
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-80 overflow-y-auto"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="item in conditionalChoices"
                                :key="
                                    [item.field.key, item.option.value].join(
                                        '-',
                                    )
                                "
                                @select="
                                    emit(
                                        'insertField',
                                        item.field,
                                        item.option.value,
                                    )
                                "
                            >
                                X si {{ item.field.label }} =
                                {{ item.option.label }}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                v-if="conditionalChoices.length === 0"
                                disabled
                            >
                                Cree primero un campo de selección
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Database />
                        Dato repetible
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                        class="max-h-80 w-72 overflow-y-auto"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                v-for="column in repeatedColumns"
                                :key="column.key"
                                :disabled="!canInsertRepeatedColumn(column)"
                                @select="emit('insertRepeatedColumn', column)"
                            >
                                <span class="min-w-0">
                                    <span class="block truncate font-medium">
                                        {{ column.label }}
                                    </span>
                                    <span
                                        class="block truncate text-xs text-muted-foreground"
                                    >
                                        ${{ column.key }}
                                    </span>
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                v-if="repeatedColumns.length === 0"
                                disabled
                            >
                                Aún no hay datos de fila
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                :disabled="selectedRowRole === 'total'"
                                @select="emit('newData')"
                            >
                                <Plus />
                                {{
                                    selectedRowRole === 'unit'
                                        ? 'Nuevo dato de unidad…'
                                        : 'Nuevo dato de fila…'
                                }}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Rows3 />
                        Estructura de filas
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="w-72">
                        <DropdownMenuCheckboxItem
                            :checked="groupedByUnit"
                            @select.prevent="
                                emit('groupedByUnit', !groupedByUnit)
                            "
                        >
                            Organizar por unidades
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel> Tipo de fila </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            :model-value="selectedRowRole"
                            @update:model-value="emit('rowRole', $event)"
                        >
                            <DropdownMenuRadioItem
                                value="fixed"
                                :disabled="
                                    selectedRowRole !== 'fixed' &&
                                    selectedRowHasColumns
                                "
                            >
                                Fila normal
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="record">
                                Fila que completa el docente
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="unit">
                                Datos de la unidad
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="total">
                                Fila de totales
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
