<script setup lang="ts">
import type { Component } from 'vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, withoutFinalPeriod } from '@/lib/utils';

export type DialogAction = {
    key: string;
    label: string;
    icon: Component;
    destructive?: boolean;
    disabled?: boolean;
    disabledReason?: string;
    loading?: boolean;
};

withDefaults(defineProps<{ actions: DialogAction[]; menuLabel: string; inline?: boolean }>(), { inline: false });
const emit = defineEmits<{ select: [key: string] }>();
</script>

<template>
    <template v-if="actions.length === 1 || inline">
      <template v-for="action in actions" :key="action.key">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger as-child>
                    <span class="inline-flex" :tabindex="action.disabled && action.disabledReason ? 0 : undefined">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            :class="cn(action.destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive')"
                            :aria-label="action.label"
                            :aria-describedby="action.disabled && action.disabledReason ? `dialog-action-reason-${action.key}` : undefined"
                            :disabled="action.disabled || action.loading"
                            @click="emit('select', action.key)"
                        >
                            <Spinner v-if="action.loading" />
                            <component :is="action.icon" v-else aria-hidden="true" />
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>{{ action.disabled && action.disabledReason ? withoutFinalPeriod(action.disabledReason) : action.label }}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <span v-if="action.disabled && action.disabledReason" :id="`dialog-action-reason-${action.key}`" class="sr-only">{{ action.disabledReason }}</span>
      </template>
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
