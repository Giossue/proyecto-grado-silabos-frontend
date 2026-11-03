<script setup lang="ts">
import { computed } from 'vue';
import AcademicLoadingSkeleton from '@/components/domain/loading/AcademicLoadingSkeleton.vue';
import DashboardLoadingSkeleton from '@/components/domain/loading/DashboardLoadingSkeleton.vue';
import SetupLoadingSkeleton from '@/components/domain/loading/SetupLoadingSkeleton.vue';
import DocumentLoadingSkeleton from '@/components/domain/loading/DocumentLoadingSkeleton.vue';
import MetricsLoadingSkeleton from '@/components/domain/loading/MetricsLoadingSkeleton.vue';
import SettingsLoadingSkeleton from '@/components/domain/loading/SettingsLoadingSkeleton.vue';
import TableLoadingSkeleton from '@/components/domain/loading/TableLoadingSkeleton.vue';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingVariant =
    | 'table'
    | 'table-body'
    | 'table-detail'
    | 'detail'
    | 'form'
    | 'document'
    | 'dashboard'
    | 'setup'
    | 'academic'
    | 'catalog'
    | 'academic-structure'
    | 'notifications'
    | 'cards'
    | 'syllabus-cards'
    | 'accordion'
    | 'workspace'
    | 'syllabus'
    | 'review'
    | 'preview'
    | 'documents'
    | 'source'
    | 'template'
    | 'comparison'
    | 'settings';

const props = withDefaults(defineProps<{
    variant?: LoadingVariant;
    rows?: number;
    columns?: number;
    mode?: 'curriculum' | 'schedule' | 'teachers';
    filters?: number;
    search?: boolean;
    pagination?: boolean;
    actions?: boolean;
    cellLines?: number | number[];
    badges?: number[];
    selectable?: boolean;
    chip?: boolean;
    tabs?: number;
    heading?: boolean;
    widths?: string[];
    sidebar?: boolean;
    plainToolbar?: boolean;
    workspaceCount?: number;
    reviewStage?: 'coordination' | 'library';
    readonly?: boolean;
    settingsSection?: 'profile' | 'security' | 'system';
    metrics?: boolean;
}>(), {
    variant: 'table',
    rows: 5,
    columns: 6,
    filters: 0,
    search: undefined,
    pagination: true,
    actions: true,
    cellLines: 1,
    badges: undefined,
    selectable: false,
    chip: false,
    tabs: 0,
    heading: false,
    widths: undefined,
    sidebar: false,
    plainToolbar: false,
    workspaceCount: 3,
    readonly: false,
    metrics: false,
});

const tableProps = computed(() => ({
    rows: props.rows,
    columns: props.columns,
    search: props.search ?? props.variant !== 'table-body',
    filters: props.filters,
    pagination: props.pagination,
    actions: props.actions,
    cellLines: props.cellLines,
    badges: props.badges,
    selectable: props.selectable,
    tabs: props.tabs,
    heading: props.heading,
    widths: props.widths,
    plainToolbar: props.plainToolbar,
}));
</script>

<template>
    <div class="flex w-full min-w-0 flex-col gap-6" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando contenido">
        <span class="sr-only">Cargando contenido…</span>
        <div aria-hidden="true" class="contents">
            <Skeleton v-if="chip" data-skeleton="table-chip" class="h-5 w-28 rounded-full" />

            <MetricsLoadingSkeleton v-if="metrics" />

            <TableLoadingSkeleton v-if="variant === 'table-body'" v-bind="tableProps" />

            <TableLoadingSkeleton v-else-if="variant === 'table' || variant === 'catalog' || variant === 'academic'" v-bind="tableProps" />

            <Card v-else-if="variant === 'table-detail'" class="min-w-0">
                <CardHeader>
                    <Skeleton class="h-5 w-52 max-w-full" />
                    <Skeleton class="h-4 w-80 max-w-full" />
                </CardHeader>
                <CardContent><TableLoadingSkeleton v-bind="tableProps" /></CardContent>
            </Card>

            <div v-else-if="variant === 'syllabus-cards'" class="flex min-w-0 flex-col gap-6">
                <Card data-skeleton="table-toolbar" class="py-3">
                    <CardContent class="flex flex-col gap-3 px-3 lg:flex-row lg:items-end">
                        <Skeleton class="h-9 w-full lg:min-w-64 lg:flex-1" />
                        <Skeleton class="h-9 w-full sm:hidden" />
                        <Skeleton class="hidden h-9 sm:block lg:w-48" />
                    </CardContent>
                </Card>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Card v-for="card in Math.max(1, rows)" :key="card" class="min-w-0" data-skeleton="syllabus-card">
                        <CardHeader class="gap-2">
                            <Skeleton class="h-5 w-3/4" />
                            <Skeleton class="h-4 w-24" />
                        </CardHeader>
                        <CardContent class="flex flex-col gap-2">
                            <Skeleton class="h-5 w-24 rounded-full" />
                        </CardContent>
                    </Card>
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

            <div v-else-if="variant === 'accordion'" class="flex min-w-0 flex-col gap-4">
                <Card data-skeleton="table-toolbar" class="py-3">
                    <CardContent class="flex flex-col gap-3 px-3 lg:flex-row lg:items-end">
                        <Skeleton class="h-9 w-full lg:min-w-64 lg:flex-1" />
                        <Skeleton v-if="filters > 0" class="h-9 w-full sm:hidden" />
                        <div v-if="filters > 0" class="hidden gap-3 sm:grid sm:grid-cols-2 lg:flex lg:items-end">
                            <Skeleton v-for="filter in filters" :key="filter" class="h-9 w-full lg:w-44" />
                        </div>
                    </CardContent>
                </Card>
                <div class="flex flex-col gap-2">
                    <div v-for="group in Math.max(1, rows)" :key="group" data-skeleton="accordion-row" class="flex items-center gap-2 rounded-md bg-card px-4 py-3 ring-1 ring-surface-ring">
                        <Skeleton class="h-5 w-20" />
                        <span class="flex-1" />
                        <Skeleton class="h-5 w-10 rounded-full" />
                        <Skeleton class="size-4" />
                    </div>
                </div>
            </div>

            <DashboardLoadingSkeleton v-else-if="variant === 'dashboard'" />

            <SetupLoadingSkeleton v-else-if="variant === 'setup'" :steps="5" />

            <SettingsLoadingSkeleton v-else-if="variant === 'settings'" :section="settingsSection" :readonly="readonly" />

            <AcademicLoadingSkeleton v-else-if="variant === 'academic-structure'" :mode="mode" :rows="rows" />

            <DocumentLoadingSkeleton
                v-else-if="variant === 'syllabus' || variant === 'review' || variant === 'preview' || variant === 'template' || variant === 'comparison' || variant === 'documents'"
                :variant="variant"
                :rows="rows"
                :review-stage="reviewStage"
            />

            <Card v-else-if="variant === 'notifications'">
                <CardContent class="flex flex-col gap-3">
                    <div v-for="notification in rows" :key="notification" data-skeleton="notification" class="flex flex-col gap-3 rounded-md bg-muted/40 ring-1 ring-surface-ring p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div class="flex min-w-0 flex-1 flex-col gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <Skeleton class="h-5 w-56 max-w-full" />
                                <Skeleton class="h-5 w-14 rounded-full" />
                            </div>
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-4/5" />
                            <Skeleton class="mt-1 h-3 w-48 max-w-full" />
                        </div>
                        <div class="flex shrink-0 flex-wrap gap-2">
                            <Skeleton class="h-8 w-28" />
                            <Skeleton class="h-8 w-20" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div v-else-if="variant === 'workspace'" class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6">
                <div class="flex min-w-0 flex-col gap-2">
                    <Skeleton class="h-8 w-72 max-w-full" />
                    <Skeleton class="h-5 w-112 max-w-full" />
                </div>
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Card v-for="card in Math.max(1, workspaceCount)" :key="card" class="h-full min-w-0">
                        <CardHeader class="gap-3">
                            <Skeleton class="h-5 w-3/4" />
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-2/3" />
                        </CardHeader>
                        <CardFooter class="mt-auto"><Skeleton class="h-9 w-full" /></CardFooter>
                    </Card>
                </div>
            </div>

            <div v-else-if="variant === 'form'" :class="sidebar ? 'flex flex-col gap-6 md:flex-row md:items-start' : 'contents'">
                <div v-if="sidebar" data-skeleton="form-sections" class="flex w-full shrink-0 flex-col gap-1 md:w-72">
                    <div v-for="section in 4" :key="section" class="flex items-center border-l-2 px-3 py-2"><Skeleton class="h-5 w-3/4" /></div>
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-7">
                    <div v-for="row in rows" :key="row" class="flex flex-col gap-2">
                        <div class="flex items-center justify-between gap-2">
                            <Skeleton class="h-3.5 w-32" />
                            <Skeleton v-if="sidebar" class="h-5 w-44 max-w-1/2" />
                        </div>
                        <Skeleton class="h-9 w-full" />
                    </div>
                </div>
            </div>

            <div v-else-if="variant === 'cards'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card v-for="card in rows" :key="card" class="min-w-0">
                    <CardHeader class="gap-3">
                        <Skeleton class="h-5 w-3/4" />
                        <Skeleton class="h-4 w-full" />
                    </CardHeader>
                    <CardContent><Skeleton class="h-4 w-2/3" /></CardContent>
                </Card>
            </div>

            <Card v-else>
                <CardHeader class="gap-3">
                    <Skeleton class="h-5 w-56 max-w-full" />
                    <Skeleton class="h-4 w-80 max-w-full" />
                </CardHeader>
                <CardContent class="flex flex-col gap-6">
                    <div v-for="row in rows" :key="row" class="flex flex-col gap-3">
                        <Skeleton class="h-4 w-40 max-w-full" />
                        <Skeleton class="h-4 w-full" />
                        <Skeleton class="h-4 w-5/6" />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>
