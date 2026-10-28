<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
    rows?: number;
    columns?: number;
    search?: boolean;
    filters?: number;
    pagination?: boolean;
    actions?: boolean;
    selectable?: boolean;
    tabs?: number;
    heading?: boolean;
    widths?: string[];
    plainToolbar?: boolean;
    cellLines?: number | number[];
}>(), {
    rows: 5,
    columns: 6,
    search: false,
    filters: 0,
    pagination: true,
    actions: true,
    selectable: false,
    tabs: 0,
    heading: false,
    widths: undefined,
    plainToolbar: false,
    cellLines: 1,
});

const columnCount = computed(() => Math.max(2, props.columns));
const dataColumns = computed(() => columnCount.value - (props.actions ? 1 : 0));
const linesFor = (column: number): number =>
    Math.max(1, Array.isArray(props.cellLines) ? (props.cellLines[column - 1] ?? 1) : props.cellLines);
const gridColumns = computed(() => {
    if (props.widths?.length) return `${props.selectable ? '2.5rem ' : ''}${props.widths.join(' ')}`;
    const additional = dataColumns.value - 1;
    return `${props.selectable ? '2.5rem ' : ''}minmax(0, 2fr)${additional > 0 ? ` repeat(${additional}, minmax(0, 1fr))` : ''}${props.actions ? ' 3rem' : ''}`;
});
const minimumWidth = computed(() =>
    `calc(var(--layout-skeleton-leading-column) + ${dataColumns.value - 1} * var(--layout-skeleton-column)${props.actions ? ' + 3rem' : ''}${props.selectable ? ' + 2.5rem' : ''})`,
);
const hasToolbar = computed(() => props.search || props.filters > 0);
</script>

<template>
    <div class="flex min-w-0 flex-col gap-4">
        <div v-if="tabs > 0" data-skeleton="table-tabs" class="flex h-11 items-center gap-2">
            <div v-for="tab in tabs" :key="tab" class="flex h-full items-center gap-2 px-4">
                <Skeleton class="size-4" />
                <Skeleton :class="cn('h-4', tab === 1 ? 'w-28' : 'w-20')" />
            </div>
        </div>

        <div v-if="heading" data-skeleton="table-heading" class="-mb-1 flex h-5 items-center"><Skeleton class="h-4 w-28" /></div>

        <component :is="plainToolbar ? 'div' : Card" v-if="hasToolbar" data-skeleton="table-toolbar" :class="plainToolbar ? '' : 'py-3'">
            <component :is="plainToolbar ? 'div' : CardContent" :class="cn('flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end', !plainToolbar && 'px-3')">
                <div v-if="search" class="min-w-0 lg:min-w-64 lg:flex-1">
                    <Skeleton class="h-9 w-full" />
                </div>
                <Skeleton v-if="filters > 0" class="h-9 w-full sm:hidden" />
                <div v-if="filters > 0" data-skeleton="table-filters" class="hidden gap-3 sm:grid sm:grid-cols-2 lg:flex lg:items-end">
                    <div v-for="filter in filters" :key="filter" class="min-w-0 lg:w-48 lg:shrink-0">
                        <Skeleton class="h-9 w-full" />
                    </div>
                </div>
            </component>
        </component>

        <div class="min-w-0" data-skeleton="table-content">
            <div class="hidden overflow-x-auto rounded-md bg-card shadow-surface ring-1 ring-surface-ring sm:block" data-skeleton="table-desktop">
                <div :style="{ minWidth: minimumWidth }">
                    <div class="grid h-10 items-stretch border-b" :style="{ gridTemplateColumns: gridColumns }">
                        <div v-if="selectable" class="flex items-center px-2"><Skeleton class="size-4" /></div>
                        <div v-for="column in columnCount" :key="column" :class="cn('flex min-w-0 items-center px-2', (selectable || column > 1) && 'border-l border-border')">
                            <Skeleton v-if="actions && column === columnCount" class="ml-auto h-3.5 w-12" />
                            <Skeleton v-else class="h-3.5 w-3/4" />
                        </div>
                    </div>
                    <div v-for="row in rows" :key="row" data-skeleton="table-row" class="grid items-stretch border-b last:border-b-0 odd:bg-card even:bg-muted/50" :style="{ gridTemplateColumns: gridColumns }">
                        <div v-if="selectable" class="flex items-center px-2"><Skeleton class="size-4" /></div>
                        <div v-for="column in columnCount" :key="column" :class="cn('flex min-w-0 flex-col justify-center p-2', (selectable || column > 1) && 'border-l border-border')">
                            <Skeleton v-if="actions && column === columnCount" class="ml-auto size-8" />
                            <template v-else>
                                <div class="flex h-5 items-center"><Skeleton :class="cn('h-4', row % 2 === 0 ? 'w-3/4' : 'w-5/6')" /></div>
                                <div v-for="line in linesFor(column) - 1" :key="line" class="flex h-5 items-center"><Skeleton class="h-3 w-2/3" /></div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-4 sm:hidden" data-skeleton="table-mobile">
                <div v-for="row in rows" :key="row" data-skeleton="table-card" class="flex min-w-0 flex-col gap-6 rounded-md bg-card p-4 shadow-surface ring-1 ring-surface-ring odd:bg-card even:bg-secondary">
                    <div class="flex min-w-0 flex-col gap-1.5">
                        <Skeleton class="h-5 w-3/4" />
                        <Skeleton v-for="line in linesFor(1) - 1" :key="line" class="h-4 w-1/2" />
                    </div>
                    <div v-if="dataColumns > 1" class="grid grid-cols-2 gap-x-4 gap-y-6">
                        <div v-for="cell in dataColumns - 1" :key="cell" class="flex min-w-0 flex-col gap-1.5">
                            <Skeleton class="h-3 w-16" />
                            <Skeleton class="h-4 w-5/6" />
                            <Skeleton v-for="line in linesFor(cell + 1) - 1" :key="line" class="h-3 w-2/3" />
                        </div>
                    </div>
                    <div v-if="actions" class="flex items-center justify-between border-t pt-3"><Skeleton class="h-3 w-20" /><Skeleton class="size-8" /></div>
                </div>
            </div>
        </div>

        <div v-if="pagination" data-skeleton="table-pagination" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton class="h-4 w-16" />
            <div class="flex items-center gap-1">
                <Skeleton class="size-9 sm:w-24" />
                <Skeleton class="h-5 w-32 sm:hidden" />
                <Skeleton v-for="page in 3" :key="page" class="hidden size-9 sm:block" />
                <Skeleton class="size-9 sm:w-24" />
            </div>
        </div>
    </div>
</template>
