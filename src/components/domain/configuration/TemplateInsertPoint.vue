<script setup lang="ts">
import { Plus } from '@lucide/vue';
import { Button } from '@/components/ui/button';

export type InsertAction = { key: string; label: string };

defineProps<{ actions: InsertAction[]; position: 'top' | 'bottom' | 'inline'; gap: 'field' | 'section'; disabled?: boolean }>();
const emit = defineEmits<{ insert: [key: string] }>();
</script>

<template>
    <div
        class="group/insert absolute inset-x-0 z-0 flex items-center justify-center gap-2"
        :class="[position === 'inline' ? 'inset-y-0' : 'h-6', position === 'top' ? (gap === 'field' ? '-top-4.5' : '-top-6') : '', position === 'bottom' ? (gap === 'field' ? '-bottom-4.5' : '-bottom-6') : '']"
        data-insert-point
    >
        <span class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-primary/60 opacity-0 transition-opacity group-hover/insert:opacity-100" aria-hidden="true" />
        <Button
            v-for="action in actions"
            :key="action.key"
            type="button"
            size="sm"
            tabindex="-1"
            class="relative h-6 rounded-full px-2.5 font-sans text-xs opacity-0 shadow-menu transition-opacity group-hover/insert:opacity-100 focus-visible:opacity-100"
            :disabled="disabled"
            :aria-label="action.label"
            @click="emit('insert', action.key)"
        >
            <Plus data-icon="inline-start" aria-hidden="true" />{{ action.label }}
        </Button>
    </div>
</template>
