<script setup lang="ts">
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
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
    <MenuTooltip :label="label"><DropdownMenu>
        <DropdownMenuTrigger as-child>
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuGroup>
                <slot />
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu></MenuTooltip>
</template>
