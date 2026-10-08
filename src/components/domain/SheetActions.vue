<script setup lang="ts">
import type { Component } from 'vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SheetAction = {
    key: string;
    label: string;
    icon: Component;
    destructive?: boolean;
    disabled?: boolean;
    loading?: boolean;
};

defineProps<{ actions: SheetAction[]; menuLabel: string }>();
const emit = defineEmits<{ select: [key: string] }>();
</script>

<template>
    <template v-if="actions.length === 1">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger as-child>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        :class="cn(actions[0].destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive')"
                        :aria-label="actions[0].label"
                        :disabled="actions[0].disabled || actions[0].loading"
                        @click="emit('select', actions[0].key)"
                    >
                        <Spinner v-if="actions[0].loading" />
                        <component :is="actions[0].icon" v-else aria-hidden="true" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{{ actions[0].label }}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </template>
    <TableActionsMenu v-else-if="actions.length > 1" :label="menuLabel">
        <DropdownMenuItem
            v-for="action in actions"
            :key="action.key"
            :variant="action.destructive ? 'destructive' : 'default'"
            :disabled="action.disabled || action.loading"
            @select="emit('select', action.key)"
        >
            <Spinner v-if="action.loading" data-icon="inline-start" />
            <component :is="action.icon" v-else aria-hidden="true" />
            {{ action.label }}
        </DropdownMenuItem>
    </TableActionsMenu>
</template>
