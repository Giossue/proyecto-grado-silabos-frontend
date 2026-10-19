<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed, useTemplateRef } from 'vue';
import { useHorizontalOverflow } from '@/composables/useHorizontalOverflow';
import { cn } from '@/lib/utils';

const props = withDefaults(
    defineProps<{
        class?: HTMLAttributes['class'];
        label?: string;
        cards?: boolean;
    }>(),
    {
        cards: true,
    },
);

const container = useTemplateRef<HTMLElement>('container');
const { canScrollLeft, canScrollRight, overflows } =
    useHorizontalOverflow(container);

const region = computed(
    () => props.label ?? 'Tabla con desplazamiento horizontal',
);
</script>

<template>
    <div class="relative w-full min-w-0">
        <div
            ref="container"
            data-slot="table-container"
            class="w-full overflow-x-auto overflow-y-hidden rounded-md bg-card shadow-surface ring-1 ring-surface-ring [&:has(>table[data-cards=true])]:max-sm:shadow-none [&:has(>table[data-cards=true])]:max-sm:ring-0 [&:has(>table[data-cards=true])]:max-sm:overflow-visible [&:has(>table[data-cards=true])]:max-sm:bg-transparent [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]"
            :tabindex="overflows ? 0 : undefined"
            :role="overflows ? 'region' : undefined"
            :aria-label="overflows ? region : undefined"
        >
            <table
                data-slot="table"
                role="table"
                :aria-label="props.label"
                :data-overflows="overflows ? 'true' : 'false'"
                :data-cards="props.cards ? 'true' : 'false'"
                :class="cn('w-full caption-bottom text-sm', props.class)"
            >
                <slot />
            </table>
        </div>

        <div
            v-show="canScrollLeft"
            data-table-edge="left"
            class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent"
            aria-hidden="true"
        />
        <div
            v-show="canScrollRight"
            data-table-edge="right"
            class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent"
            aria-hidden="true"
        />
    </div>
</template>
