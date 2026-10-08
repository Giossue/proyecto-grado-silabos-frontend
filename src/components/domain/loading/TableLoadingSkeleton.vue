<script setup lang="ts">
import { computed } from 'vue';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
    rows?: number;
    columns?: number;
    search?: boolean;
    filters?: number;
    pagination?: boolean;
    actions?: boolean;
    cellLines?: number;
}>(), {
    rows: 5,
    columns: 6,
    search: false,
    filters: 0,
    pagination: true,
    actions: true,
    cellLines: 1,
});

const columnCount = computed(() => Math.max(2, props.columns));
const gridColumns = computed(() => {
    const additional = columnCount.value - (props.actions ? 2 : 1);
    return `minmax(0, 2fr)${additional > 0 ? ` repeat(${additional}, minmax(0, 1fr))` : ''}${props.actions ? ' 3rem' : ''}`;
});
const minimumWidth = computed(() =>
    `calc(var(--layout-skeleton-leading-column) + ${columnCount.value - (props.actions ? 2 : 1)} * var(--layout-skeleton-column)${props.actions ? ' + 3rem' : ''})`,
);
</script>

<template>
    <div class="flex min-w-0 flex-col gap-4">
        <div v-if="search || filters > 0" data-skeleton="table-toolbar" class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div v-if="search" class="min-w-0 lg:min-w-64 lg:flex-1">
                <Skeleton class="h-9 w-full" />
            </div>
            <Skeleton v-if="filters > 0" class="h-9 w-full sm:hidden" />
            <div v-if="filters > 0" data-skeleton="table-filters" class="hidden gap-3 sm:grid sm:grid-cols-2 lg:flex lg:items-end">
                <div v-for="filter in filters" :key="filter" class="min-w-0 lg:w-48 lg:shrink-0">
                    <Skeleton class="h-9 w-full" />
                </div>
            </div>
        </div>

        <div class="min-w-0 overflow-hidden rounded-md border" data-skeleton="table-content">
            <div class="hidden overflow-x-auto sm:block" data-skeleton="table-desktop">
                <div :style="{ minWidth: minimumWidth }">
                    <div class="grid h-10 items-center gap-4 border-b bg-muted px-2" :style="{ gridTemplateColumns: gridColumns }">
                        <div v-for="column in columnCount" :key="column" class="min-w-0">
                            <Skeleton class="h-3.5 w-3/4" />
                        </div>
                    </div>
                    <div v-for="row in rows" :key="row" data-skeleton="table-row" class="grid items-center gap-4 border-b px-2 py-2 last:border-b-0 odd:bg-card even:bg-muted/50" :style="{ gridTemplateColumns: gridColumns }">
                        <div v-for="column in columnCount" :key="column" class="flex min-w-0 flex-col gap-1.5">
                            <Skeleton v-if="actions && column === columnCount" class="ml-auto size-8" />
                            <template v-else>
                                <Skeleton :class="cn('h-4', row % 2 === 0 ? 'w-3/4' : 'w-5/6')" />
                                <Skeleton v-for="line in Math.max(0, cellLines - 1)" :key="line" class="h-3 w-2/3" />
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sm:hidden" data-skeleton="table-mobile">
                <div class="grid h-10 grid-cols-(--layout-table-skeleton-mobile-columns) items-center gap-2 border-b bg-muted px-2">
                    <Skeleton class="h-3.5 w-3/4" />
                    <Skeleton class="h-3.5 w-2/3" />
                </div>
                <div v-for="row in rows" :key="row" class="grid min-h-14 grid-cols-(--layout-table-skeleton-mobile-columns) items-center gap-2 border-b px-2 py-3 last:border-b-0 odd:bg-card even:bg-muted/50">
                    <div v-for="cell in 2" :key="cell" class="flex min-w-0 flex-col gap-1.5">
                        <Skeleton class="h-3.5 w-5/6" />
                        <Skeleton v-for="line in Math.max(1, cellLines - 1)" :key="line" class="h-3 w-2/3" />
                    </div>
                    <Skeleton v-if="columns > 2" class="h-8 w-full" />
                </div>
            </div>
        </div>

        <div v-if="pagination" data-skeleton="table-pagination" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton class="h-4 w-28" />
            <div class="flex items-center gap-1">
                <Skeleton class="size-9 sm:w-24" />
                <Skeleton class="size-9" />
                <Skeleton class="size-9 sm:w-24" />
            </div>
        </div>
    </div>
</template>
