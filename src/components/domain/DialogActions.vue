<script setup lang="ts">
import type { Component } from 'vue';
import { Button } from '@/components/ui/button';
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

// Acciones secundarias del pie del modal: botones con texto junto a los principales.
defineProps<{ actions: DialogAction[] }>();
const emit = defineEmits<{ select: [key: string] }>();
</script>

<template>
    <template v-for="action in actions" :key="action.key">
        <TooltipProvider :disabled="!(action.disabled && action.disabledReason)">
            <Tooltip>
                <TooltipTrigger as-child>
                    <span class="inline-flex" :tabindex="action.disabled && action.disabledReason ? 0 : undefined">
                        <Button
                            type="button"
                            variant="outline"
                            :class="cn(action.destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive')"
                            :aria-label="action.label"
                            :aria-describedby="action.disabled && action.disabledReason ? `dialog-action-reason-${action.key}` : undefined"
                            :disabled="action.disabled || action.loading"
                            @click="emit('select', action.key)"
                        >
                            <Spinner v-if="action.loading" data-icon="inline-start" />
                            <component :is="action.icon" v-else data-icon="inline-start" aria-hidden="true" />
                            {{ action.label }}
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent v-if="action.disabled && action.disabledReason">{{ withoutFinalPeriod(action.disabledReason) }}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <span v-if="action.disabled && action.disabledReason" :id="`dialog-action-reason-${action.key}`" class="sr-only">{{ action.disabledReason }}</span>
    </template>
</template>
