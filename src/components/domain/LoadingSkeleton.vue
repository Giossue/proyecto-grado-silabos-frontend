<script setup lang="ts">
import { computed } from 'vue';
import type { RoleCode } from '@/api/session';
import AcademicLoadingSkeleton from '@/components/domain/loading/AcademicLoadingSkeleton.vue';
import DashboardLoadingSkeleton from '@/components/domain/loading/DashboardLoadingSkeleton.vue';
import DocumentLoadingSkeleton from '@/components/domain/loading/DocumentLoadingSkeleton.vue';
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
    | 'academic'
    | 'catalog'
    | 'academic-structure'
    | 'notifications'
    | 'cards'
    | 'workspace'
    | 'syllabus'
    | 'review'
    | 'documents'
    | 'source'
    | 'template'
    | 'comparison';

const props = withDefaults(defineProps<{
    variant?: LoadingVariant;
    rows?: number;
    columns?: number;
    mode?: 'curriculum' | 'schedule' | 'teachers';
    filters?: number;
    search?: boolean;
    pagination?: boolean;
    actions?: boolean;
    cellLines?: number;
    dashboardRole?: RoleCode;
    workspaceCount?: number;
    reviewStage?: 'coordination' | 'library' | 'dean';
    readonly?: boolean;
}>(), {
    variant: 'table',
    rows: 5,
    columns: 6,
    filters: 0,
    search: undefined,
    pagination: true,
    actions: true,
    cellLines: 1,
    workspaceCount: 3,
    readonly: false,
});

const tableProps = computed(() => ({
    rows: props.rows,
    columns: props.columns,
    search: props.search ?? props.variant !== 'table-body',
    filters: props.filters,
    pagination: props.pagination,
    actions: props.actions,
    cellLines: props.cellLines,
}));
</script>

<template>
    <div class="flex w-full min-w-0 flex-col gap-6" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando contenido">
        <span class="sr-only">Cargando contenido…</span>
        <div aria-hidden="true" class="contents">
            <TableLoadingSkeleton v-if="variant === 'table-body'" v-bind="tableProps" />

            <Card v-else-if="variant === 'table' || variant === 'catalog' || variant === 'academic' || variant === 'table-detail'" class="min-w-0">
                <CardHeader v-if="variant === 'table-detail'">
                    <Skeleton class="h-5 w-52 max-w-full" />
                    <Skeleton class="h-4 w-80 max-w-full" />
                </CardHeader>
                <CardContent><TableLoadingSkeleton v-bind="tableProps" /></CardContent>
            </Card>

            <DashboardLoadingSkeleton v-else-if="variant === 'dashboard'" :role="dashboardRole" />

            <AcademicLoadingSkeleton v-else-if="variant === 'academic-structure'" :mode="mode" :rows="rows" />

            <DocumentLoadingSkeleton
                v-else-if="variant === 'syllabus' || variant === 'review' || variant === 'template' || variant === 'comparison' || variant === 'documents'"
                :variant="variant"
                :rows="rows"
                :review-stage="reviewStage"
                :readonly="readonly"
            />

            <Card v-else-if="variant === 'notifications'">
                <CardContent class="flex flex-col gap-3">
                    <div v-for="notification in rows" :key="notification" class="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div class="flex min-w-0 flex-1 flex-col gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <Skeleton class="h-5 w-56 max-w-full" />
                                <Skeleton v-if="notification === 1" class="h-5 w-12 rounded-full" />
                            </div>
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-4/5" />
                            <Skeleton class="mt-1 h-3 w-48 max-w-full" />
                        </div>
                        <div v-if="notification % 2 === 1" class="flex shrink-0 flex-wrap gap-2">
                            <Skeleton class="h-8 w-24" />
                            <Skeleton class="h-8 w-16" />
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

            <div v-else-if="variant === 'form'" class="flex flex-col gap-6">
                <div v-for="row in rows" :key="row" class="flex flex-col gap-2">
                    <Skeleton class="h-3.5 w-32" />
                    <Skeleton class="h-9 w-full" />
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
