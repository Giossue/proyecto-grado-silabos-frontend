<script setup lang="ts">
import {
    Braces,
    ChevronDown,
    CircleHelp,
    FileText,
    List,
    Plus,
    Table2,
    UserPen,
} from '@lucide/vue';
import { computed } from 'vue';
import { PROJECT_PREFIX } from '@/components/domain/configuration/template-table/inlineNodeLabel';
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
import type { TemplateVariable } from '@/lib/templateDocument';

const props = defineProps<{
    disabled: boolean;
    variables: TemplateVariable[];
}>();

const emit = defineEmits<{
    insertVariable: [variable: TemplateVariable];
    teacher: [];
    yesNo: [];
    project: [];
    table: [];
    list: [];
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
        <DropdownMenuContent align="start" class="w-64">
            <DropdownMenuGroup>
                <DropdownMenuItem @select="emit('table')">
                    <Table2 />
                    Tabla
                </DropdownMenuItem>
                <DropdownMenuItem @select="emit('list')">
                    <List />
                    Lista
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
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
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
