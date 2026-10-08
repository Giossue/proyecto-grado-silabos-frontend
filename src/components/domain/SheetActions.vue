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
    disabledReason?: string;
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
                    <span class="inline-flex" :tabindex="actions[0].disabled && actions[0].disabledReason ? 0 : undefined">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            :class="cn(actions[0].destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive')"
                            :aria-label="actions[0].label"
                            :aria-describedby="actions[0].disabled && actions[0].disabledReason ? 'sheet-action-reason' : undefined"
                            :disabled="actions[0].disabled || actions[0].loading"
                            @click="emit('select', actions[0].key)"
                        >
                            <Spinner v-if="actions[0].loading" />
                            <component :is="actions[0].icon" v-else aria-hidden="true" />
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>{{ actions[0].disabled && actions[0].disabledReason ? actions[0].disabledReason : actions[0].label }}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <span v-if="actions[0].disabled && actions[0].disabledReason" id="sheet-action-reason" class="sr-only">{{ actions[0].disabledReason }}</span>
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
            <span v-if="action.disabled && action.disabledReason" class="sr-only"> — {{ action.disabledReason }}</span>
        </DropdownMenuItem>
    </TableActionsMenu>
</template>
