<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
import TableLoadingSkeleton from './TableLoadingSkeleton.vue';

withDefaults(
    defineProps<{
        mode?: 'curriculum' | 'schedule' | 'teachers';
        rows?: number;
    }>(),
    {
        mode: 'schedule',
        rows: 5,
    },
);
</script>

<template>
    <div
        v-if="mode === 'curriculum'"
        data-skeleton="curriculum-canvas"
        class="curriculum-canvas relative h-(--curriculum-canvas-height) min-h-136 overflow-hidden rounded-lg ring-1 ring-surface-ring bg-(--curriculum-canvas-background) shadow-surface"
    >
        <div class="absolute inset-0 flex items-start justify-center p-4">
            <Skeleton data-skeleton="curriculum-level" class="h-full w-full max-w-3xl" />
        </div>
        <div class="absolute top-3 right-3 hidden w-64 flex-col gap-3 rounded-md bg-card/90 p-3 shadow-surface ring-1 ring-surface-ring sm:flex">
            <div class="flex items-center justify-between"><Skeleton class="h-3 w-28" /><Skeleton class="size-5" /></div>
            <div class="flex flex-col gap-2">
                <div v-for="relation in 2" :key="relation" class="flex items-center gap-2"><Skeleton class="h-0.5 w-5" /><Skeleton class="h-2.5 w-24" /></div>
            </div>
            <div class="flex flex-col gap-2 border-t pt-3">
                <div v-for="unit in 3" :key="unit" class="flex items-center gap-2"><Skeleton class="size-3" /><Skeleton class="h-2.5 w-32" /></div>
            </div>
            <div class="flex flex-col gap-2 border-t pt-3">
                <div v-for="total in 3" :key="total" class="flex items-center justify-between gap-3"><Skeleton class="h-2.5 w-24" /><Skeleton class="h-2.5 w-6" /></div>
            </div>
        </div>
        <Skeleton class="absolute top-3 right-3 size-9 sm:hidden" />
        <div class="absolute bottom-3 left-3 flex flex-col gap-1">
            <Skeleton v-for="control in 2" :key="control" class="size-8" />
        </div>
    </div>
    <TableLoadingSkeleton
        v-else
        :data-skeleton="mode === 'schedule' ? 'scheduled-subjects' : 'teachers'"
        :rows="rows"
        :columns="mode === 'schedule' ? 5 : 3"
        :filters="mode === 'schedule' ? 3 : 1"
        :actions="false"
        :selectable="mode === 'schedule'"
        search
    />
</template>
