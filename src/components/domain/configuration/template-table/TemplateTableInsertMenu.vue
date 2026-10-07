<script setup lang="ts">
import { ChevronDown, List, Plus, Table2, UserPen } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
defineProps<{
    disabled: boolean;
}>();

const emit = defineEmits<{
    teacher: [];
    table: [];
    list: [];
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
                <DropdownMenuItem @select="emit('teacher')">
                    <UserPen />
                    Docente
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
