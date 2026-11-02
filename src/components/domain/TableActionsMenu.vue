<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { MoreHorizontal } from '@lucide/vue';
import type { VNode } from 'vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

withDefaults(
    defineProps<{
        label: string;
        disabled?: boolean;
    }>(),
    {
        disabled: false,
    },
);

defineSlots<{
    default(): VNode[];
}>();
</script>

<template>
    <DropdownMenu>
        <IconTooltip :label="label"><DropdownMenuTrigger as-child>
            <Button
                type="button"
                data-slot="table-actions"
                data-table-actions
                variant="ghost"
                size="icon-sm"
                :aria-label="label"
                :disabled="disabled"
            >
                <MoreHorizontal data-icon="inline-start" aria-hidden="true" />
            </Button>
        </DropdownMenuTrigger></IconTooltip>
        <DropdownMenuContent align="end">
            <DropdownMenuGroup>
                <slot />
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
