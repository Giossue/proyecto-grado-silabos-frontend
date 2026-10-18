<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import TableLoadingSkeleton from './TableLoadingSkeleton.vue';

const props = withDefaults(
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
    <Card v-else class="min-w-0">
        <CardContent class="flex min-w-0 flex-col gap-4">
            <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
                <Skeleton class="h-9 w-full min-w-0 lg:flex-1" />
                <Skeleton class="h-9 w-full sm:hidden" />
                <div class="hidden min-w-0 grid-cols-2 gap-3 sm:grid lg:flex lg:flex-none">
                    <Skeleton v-for="filter in mode === 'schedule' ? 3 : 1" :key="filter" class="h-9 w-full lg:w-44" />
                </div>
            </div>
            <TableLoadingSkeleton class="sm:hidden" :rows="rows" :columns="mode === 'schedule' ? 6 : 4" :pagination="false" />
            <div class="hidden min-w-0 overflow-x-auto sm:block" :data-skeleton="mode === 'schedule' ? 'scheduled-subjects' : 'teachers'">
                <div
                    :class="cn(
                        'grid grid-cols-(--layout-table-skeleton-mobile-columns) items-center gap-4 border-b bg-muted px-2 py-3',
                        mode === 'schedule'
                            ? 'sm:min-w-216 sm:grid-cols-(--layout-scheduled-skeleton-columns)'
                            : 'sm:min-w-184 sm:grid-cols-(--layout-teachers-skeleton-columns)',
                    )"
                >
                    <Skeleton class="h-3 w-16" />
                    <Skeleton class="h-3 w-12" />
                    <template v-if="mode === 'schedule'">
                        <Skeleton class="hidden h-3 w-16 sm:block" />
                        <Skeleton class="hidden h-3 w-16 sm:block" />
                    </template>
                    <Skeleton class="hidden h-3 w-16 sm:block" />
                    <Skeleton class="h-3 w-16 justify-self-end sm:w-8" />
                </div>
                <div
                    v-for="row in props.rows"
                    :key="row"
                    :class="cn(
                        'grid grid-cols-(--layout-table-skeleton-mobile-columns) items-center gap-4 border-b px-2 py-2 last:border-b-0 odd:bg-card even:bg-muted/50',
                        mode === 'schedule'
                            ? 'sm:min-w-216 sm:grid-cols-(--layout-scheduled-skeleton-columns)'
                            : 'sm:min-w-184 sm:grid-cols-(--layout-teachers-skeleton-columns)',
                    )"
                >
                    <Skeleton class="h-3 w-4/5" />
                    <Skeleton v-if="mode === 'schedule'" class="h-3 w-6" />
                    <Skeleton v-else class="h-3 w-5/6" />
                    <template v-if="mode === 'schedule'">
                        <div class="hidden flex-col gap-1 sm:flex">
                            <div v-for="parallel in row % 2 === 0 ? 1 : 2" :key="parallel" class="flex h-6 items-center"><Skeleton class="h-5 w-8 rounded-full" /></div>
                        </div>
                        <div class="hidden flex-col gap-1 sm:flex">
                            <div v-for="parallel in row % 2 === 0 ? 1 : 2" :key="parallel" class="flex h-6 items-center"><Skeleton class="h-3 w-3/4" /></div>
                        </div>
                        <div class="hidden flex-col gap-1 sm:flex">
                            <div v-for="parallel in row % 2 === 0 ? 1 : 2" :key="parallel" class="flex h-6 items-center"><Skeleton class="h-3 w-4/5" /></div>
                        </div>
                    </template>
                    <Skeleton v-else class="hidden h-3 w-3/4 sm:block" />
                    <Skeleton class="h-8 w-20 justify-self-end sm:size-8" />
                </div>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton class="h-4 w-28" />
                <div class="flex items-center gap-2">
                    <Skeleton class="size-9 sm:w-24" />
                    <Skeleton class="h-5 w-32 sm:size-9" />
                    <Skeleton class="size-9 sm:w-24" />
                </div>
            </div>
        </CardContent>
    </Card>
</template>
