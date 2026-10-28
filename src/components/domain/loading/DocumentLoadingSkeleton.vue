<script setup lang="ts">
import { computed } from 'vue';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import TableLoadingSkeleton from '@/components/domain/loading/TableLoadingSkeleton.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// `readonly` (de LoadingSkeleton) no aplica aquí: el sílabo siempre carga hacia el editor.
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        variant: 'syllabus' | 'review' | 'template' | 'comparison' | 'documents';
        rows?: number;
        reviewStage?: 'coordination' | 'library';
    }>(),
    {
        rows: 3,
        reviewStage: 'coordination',
    },
);

const sectionCount = computed(() => Math.max(1, Math.min(props.rows, 3)));
const reviewSections = computed(() => props.reviewStage === 'library' ? 1 : sectionCount.value);
const reviewPanels = computed(() =>
    props.reviewStage === 'library'
        ? ['approval', 'correction', 'history']
        : ['correction', 'approval', 'history'],
);

</script>

<template>
    <template v-if="variant === 'syllabus'">
        <div class="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-col gap-8 pb-16">
            <div data-skeleton="syllabus-tabs" class="flex flex-wrap gap-2">
                <Skeleton v-for="(width, tab) in ['w-40', 'w-32', 'w-36', 'w-28', 'w-32']" :key="tab" :class="cn('h-10 max-w-full', width)" />
            </div>

            <section data-skeleton="syllabus-section" class="flex min-w-0 flex-col gap-6 rounded-md bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
                <header class="flex min-w-0 flex-col gap-1">
                    <Skeleton class="h-7 w-56 max-w-full" />
                    <Skeleton class="h-5 w-80 max-w-full" />
                </header>
                <div class="flex min-w-0 flex-col gap-7">
                    <div v-for="field in 2" :key="field" data-skeleton="syllabus-field" class="flex min-w-0 flex-col gap-3">
                        <Skeleton class="h-4 w-48 max-w-full" />
                        <div class="flex min-w-0 flex-col rounded-md ring-1 ring-surface-ring">
                            <div class="flex items-center gap-1 border-b p-1.5">
                                <Skeleton v-for="tool in 5" :key="tool" class="size-8" />
                            </div>
                            <div class="flex min-h-32 flex-col gap-2 px-3 py-2">
                                <Skeleton class="h-4 w-full" />
                                <Skeleton class="h-4 w-2/3" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div data-skeleton="syllabus-nav" class="-mt-4 flex items-center justify-end">
                <Skeleton class="h-9 w-28" />
            </div>
        </div>
    </template>

    <div v-else-if="variant === 'review'" class="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
        <header class="flex min-w-0 flex-col gap-2" data-skeleton="review-heading">
            <Skeleton class="-mt-1 h-5 w-36 max-w-full" />
            <div class="flex min-w-0 items-center gap-3">
                <Skeleton class="size-11 shrink-0 rounded-md" />
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton class="h-8 w-72 max-w-full" />
                    <Skeleton class="h-6 w-112 max-w-full" />
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
                <Skeleton class="h-5 w-24 rounded-full" />
                <Skeleton class="h-5 w-32 rounded-full" />
                <Skeleton class="h-5 w-64 max-w-full" />
            </div>
        </header>

        <WorkspaceLayout variant="review">
            <div class="flex min-w-0 flex-col gap-6">
                <Card v-for="section in reviewSections" :key="section" data-skeleton="review-section">
                    <CardHeader class="min-w-0 grid-cols-1">
                        <Skeleton class="h-5 w-52 max-w-full" />
                        <Skeleton class="h-4 w-80 max-w-full" />
                    </CardHeader>
                    <CardContent class="flex min-w-0 flex-col gap-6">
                        <div v-for="field in 2" :key="field" class="flex min-w-0 flex-col gap-2 rounded-md ring-1 ring-surface-ring bg-muted/30 p-4">
                            <div class="flex flex-wrap items-center gap-2">
                                <Skeleton class="h-5 w-44 max-w-full" />
                                <Skeleton class="h-5 w-20 rounded-full" />
                            </div>
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-5/6" />
                            <Skeleton class="h-4 w-2/3" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <aside class="flex min-w-0 flex-col gap-6" :data-review-stage="reviewStage">
                <Card v-for="panel in reviewPanels" :key="panel" :data-skeleton="`review-${panel}`">
                    <CardHeader class="min-w-0 grid-cols-1">
                        <Skeleton class="h-5 w-48 max-w-full" />
                        <Skeleton class="h-4 w-full" />
                        <Skeleton v-if="panel !== 'history'" class="h-4 w-3/4" />
                        <Skeleton v-if="panel === 'approval'" class="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent class="flex min-w-0 flex-col gap-4">
                        <template v-if="panel === 'correction'">
                            <Skeleton class="h-4 w-40 max-w-full" />
                            <template v-if="reviewStage === 'library'">
                                <div v-for="reason in 6" :key="reason" class="flex items-center gap-2">
                                    <Skeleton class="size-4 shrink-0" />
                                    <Skeleton class="h-4 w-64 max-w-full" />
                                </div>
                                <Skeleton class="h-4 w-3/4" />
                            </template>
                            <Skeleton v-else class="h-24 w-full" />
                            <Skeleton class="h-9 w-full" />
                        </template>
                        <Skeleton v-else-if="panel === 'approval'" :class="cn('h-9', reviewStage === 'library' ? 'w-48 max-w-full' : 'w-full')" />
                        <template v-else-if="reviewStage === 'library'">
                            <Card class="gap-3 rounded-md py-3">
                                <CardHeader class="px-4"><Skeleton class="h-5 w-24 rounded-full" /></CardHeader>
                                <CardContent class="flex flex-col gap-2 px-4">
                                    <Skeleton class="h-4 w-full" />
                                    <Skeleton class="h-4 w-3/4" />
                                </CardContent>
                                <CardFooter class="px-4"><Skeleton class="h-3 w-2/3" /></CardFooter>
                            </Card>
                        </template>
                        <template v-else>
                            <div v-for="item in 2" :key="item" class="flex min-w-0 flex-col gap-2 rounded-md ring-1 ring-surface-ring p-3">
                                <div class="flex items-center justify-between gap-3">
                                    <Skeleton class="h-5 w-28" />
                                    <Skeleton class="h-5 w-20 rounded-full" />
                                </div>
                                <Skeleton class="h-4 w-3/4" />
                                <Skeleton class="mt-1 h-8 w-40 max-w-full" />
                            </div>
                        </template>
                    </CardContent>
                </Card>
            </aside>
        </WorkspaceLayout>
    </div>

    <div v-else-if="variant === 'template'" class="mx-auto flex w-full min-w-0 flex-col gap-4">
        <div data-skeleton="template-toolbar" class="mx-auto flex w-full max-w-[215.9mm] justify-end">
            <div class="flex items-center gap-2 rounded-md ring-1 ring-surface-ring bg-background/95 p-1.5 shadow-menu">
                <Skeleton class="h-9 w-24" />
            </div>
        </div>

        <div class="flex min-w-0 flex-col gap-4" data-skeleton="template-pages">
            <div class="min-w-0 overflow-x-auto py-4">
            <article class="template-sheet" data-skeleton="template-page" data-orientation="portrait">
                <div class="flex items-center justify-between gap-6">
                    <Skeleton class="h-10 w-32 max-w-2/5" />
                    <Skeleton class="h-12 w-32 max-w-2/5" />
                </div>
                <Skeleton class="mx-auto h-7 w-3/4" />
                <div v-for="section in 3" :key="section" class="flex min-w-0 flex-col gap-3">
                    <Skeleton class="h-5 w-1/2 max-w-full" />
                    <div v-if="section === 1" class="overflow-hidden rounded-sm ring-1 ring-surface-ring">
                        <div v-for="row in 4" :key="row" class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 border-b p-2 last:border-b-0">
                            <Skeleton class="h-3.5 w-3/4" />
                            <Skeleton class="h-3.5 w-full" />
                        </div>
                    </div>
                    <template v-else>
                        <div v-for="field in 2" :key="field" class="flex min-w-0 flex-col gap-1 px-2 py-1">
                            <Skeleton class="h-4 w-40 max-w-full" />
                            <Skeleton class="h-3.5 w-full" />
                            <Skeleton class="h-3.5 w-5/6" />
                        </div>
                    </template>
                </div>
            </article>
            </div>

            <div class="min-w-0 overflow-x-auto py-4">
            <article class="template-sheet template-sheet--landscape" data-skeleton="template-page" data-orientation="landscape">
                <Skeleton class="h-5 w-1/2 max-w-full" />
                <div class="overflow-hidden rounded-sm ring-1 ring-surface-ring">
                    <div class="grid grid-cols-9 gap-2 border-b bg-muted/40 p-2">
                        <Skeleton v-for="column in 9" :key="column" class="h-3.5 w-3/4" />
                    </div>
                    <div v-for="row in 16" :key="row" class="grid grid-cols-9 gap-2 border-b p-2 last:border-b-0">
                        <Skeleton v-for="column in 9" :key="column" class="h-3.5 w-full" />
                    </div>
                </div>
            </article>
            </div>
        </div>
    </div>

    <template v-else-if="variant === 'comparison'">
        <Card data-skeleton="comparison-summary">
            <CardHeader class="min-w-0 grid-cols-1">
                <Skeleton class="h-5 w-64 max-w-full" />
                <Skeleton class="h-4 w-112 max-w-full" />
            </CardHeader>
        </Card>
        <Card v-for="change in sectionCount" :key="change" data-skeleton="comparison-change">
            <CardHeader class="min-w-0 grid-cols-1">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex min-w-0 flex-col gap-2">
                        <Skeleton class="h-4 w-40 max-w-full" />
                        <Skeleton class="h-5 w-56 max-w-full" />
                    </div>
                    <Skeleton class="h-5 w-24 rounded-full" />
                </div>
            </CardHeader>
            <CardContent class="grid min-w-0 gap-4 lg:grid-cols-2">
                <div v-for="side in 2" :key="side" :class="cn('min-w-0 rounded-md border p-4', side === 1 ? 'border-destructive/30' : 'border-success/40')">
                    <Skeleton class="h-5 w-28 max-w-full" />
                    <div class="mt-3 flex flex-col gap-2">
                        <Skeleton class="h-4 w-full" />
                        <Skeleton class="h-4 w-5/6" />
                        <Skeleton class="h-4 w-3/4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </template>

    <template v-else>
        <Alert v-for="notice in 2" :key="notice" class="min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3" data-skeleton="document-notice">
            <Skeleton class="row-span-2 size-4 shrink-0" />
            <AlertTitle class="min-w-0">
                <Skeleton class="h-4 w-40 max-w-full" />
            </AlertTitle>
            <AlertDescription class="flex min-w-0 flex-col gap-2">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-5/6" />
            </AlertDescription>
        </Alert>
        <TableLoadingSkeleton :rows="rows" :columns="4" :actions="false" :cell-lines="[2, 1, 1, 1]" search :filters="1" />
    </template>
</template>
