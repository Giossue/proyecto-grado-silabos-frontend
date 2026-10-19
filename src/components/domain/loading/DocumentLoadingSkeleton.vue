<script setup lang="ts">
import { computed } from 'vue';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import TableLoadingSkeleton from '@/components/domain/loading/TableLoadingSkeleton.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const props = withDefaults(
    defineProps<{
        variant: 'syllabus' | 'review' | 'template' | 'comparison' | 'documents';
        rows?: number;
        reviewStage?: 'coordination' | 'library';
        readonly?: boolean;
    }>(),
    {
        rows: 3,
        reviewStage: 'coordination',
        readonly: false,
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
        <WorkspaceLayout variant="syllabus">
            <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
                <Card v-if="readonly" data-skeleton="syllabus-presentation">
                    <CardContent class="flex flex-col items-center gap-5 py-8">
                        <div class="flex w-full items-center justify-between gap-6">
                            <Skeleton class="h-10 w-32 max-w-full" />
                            <Skeleton class="h-14 w-32 max-w-full" />
                        </div>
                        <Skeleton class="h-7 w-3/4" />
                        <Skeleton class="h-4 w-48 max-w-full" />
                    </CardContent>
                </Card>

                <div v-if="!readonly" data-skeleton="syllabus-tabs" class="flex flex-wrap gap-1">
                    <Skeleton v-for="tab in 5" :key="tab" :class="cn('h-8 max-w-full', tab === 1 ? 'w-40' : 'w-32')" />
                </div>

                <template v-for="section in readonly ? sectionCount : 1" :key="`syllabus-section-${section}`">
                    <Separator v-if="section > 1" />
                    <section data-skeleton="syllabus-section" class="flex min-w-0 flex-col gap-6 rounded-md bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
                        <header class="flex min-w-0 flex-col gap-2">
                            <Skeleton class="h-6 w-56 max-w-full" />
                            <Skeleton class="h-4 w-80 max-w-full" />
                        </header>
                        <div class="flex min-w-0 flex-col gap-6">
                            <div v-if="section === 1" data-skeleton="academic-context" class="overflow-hidden rounded-md ring-1 ring-surface-ring">
                                <div v-for="row in 5" :key="row" class="grid grid-cols-1 gap-2 border-b p-3 last:border-b-0 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(0,2fr)]">
                                    <Skeleton class="h-3.5 w-3/4" />
                                    <Skeleton class="h-4 w-full" />
                                </div>
                            </div>
                            <div v-for="field in section === 1 ? 2 : 3" :key="field" class="flex min-w-0 flex-col gap-3">
                                <Skeleton class="h-4 w-48 max-w-full" />
                                <Skeleton v-if="!readonly" :class="cn('w-full', field === 1 ? 'h-10' : 'h-28')" />
                                <div v-else class="flex flex-col gap-2">
                                    <Skeleton class="h-4 w-full" />
                                    <Skeleton class="h-4 w-5/6" />
                                    <Skeleton v-if="field > 1" class="h-4 w-2/3" />
                                </div>
                            </div>
                        </div>
                    </section>
                </template>
            </div>

            <aside class="min-w-0" data-skeleton="unit-assistant">
                <Card class="assistant-panel gap-0 overflow-hidden py-0">
                    <CardHeader class="min-w-0 shrink-0 grid-cols-1 py-4">
                        <Skeleton class="h-5 w-48 max-w-full" />
                    </CardHeader>
                    <Separator />
                    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
                        <Skeleton class="h-28 w-36 rounded-full" />
                        <Skeleton class="h-5 w-48 max-w-full" />
                        <div class="flex w-full max-w-80 flex-col gap-3">
                            <Skeleton v-for="question in 3" :key="question" class="h-14 w-full" />
                        </div>
                    </div>
                    <Separator />
                    <CardContent class="shrink-0 px-4 py-4">
                        <div class="flex flex-col gap-3 rounded-md ring-1 ring-surface-ring p-3">
                            <Skeleton class="h-4 w-3/4" />
                            <Skeleton class="h-4 w-1/2" />
                            <Skeleton class="h-8 w-20 self-end" />
                        </div>
                    </CardContent>
                </Card>
            </aside>
        </WorkspaceLayout>
    </template>

    <div v-else-if="variant === 'review'" class="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
        <header class="flex min-w-0 flex-col gap-3" data-skeleton="review-heading">
            <Skeleton class="h-5 w-36 max-w-full" />
            <div class="flex min-w-0 items-start gap-3">
                <Skeleton class="size-11 shrink-0 rounded-md" />
                <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton class="h-8 w-72 max-w-full" />
                    <Skeleton class="h-5 w-112 max-w-full" />
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <Skeleton class="h-6 w-24 rounded-full" />
                <Skeleton class="h-6 w-32 rounded-full" />
                <Skeleton class="h-4 w-64 max-w-full" />
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
                        <div v-for="field in 2" :key="field" class="flex min-w-0 flex-col gap-3 rounded-md ring-1 ring-surface-ring p-4">
                            <Skeleton class="h-5 w-44 max-w-full" />
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
                        <Skeleton class="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent class="flex min-w-0 flex-col gap-4">
                        <template v-if="panel === 'correction'">
                            <Skeleton class="h-4 w-40 max-w-full" />
                            <Skeleton class="h-24 w-full" />
                            <Skeleton class="h-9 w-44 max-w-full" />
                        </template>
                        <Skeleton v-else-if="panel === 'approval'" class="h-9 w-48 max-w-full" />
                        <template v-else>
                            <div v-for="item in panel === 'history' ? 2 : 1" :key="item" class="flex min-w-0 flex-col gap-3 rounded-md ring-1 ring-surface-ring p-3">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <Skeleton class="h-4 w-28" />
                                    <Skeleton class="h-5 w-20 rounded-full" />
                                </div>
                                <Skeleton class="h-4 w-full" />
                                <Skeleton class="h-3 w-2/3" />
                                <Skeleton v-if="panel === 'history' && reviewStage !== 'library'" class="h-8 w-40 max-w-full" />
                            </div>
                        </template>
                    </CardContent>
                </Card>
            </aside>
        </WorkspaceLayout>
    </div>

    <div v-else-if="variant === 'template'" class="mx-auto flex w-full min-w-0 flex-col gap-6">
        <div class="flex min-w-0 flex-col gap-6" data-skeleton="template-pages">
            <div class="min-w-0 overflow-x-auto py-4">
            <article class="template-sheet" data-skeleton="template-page" data-orientation="portrait">
                <div class="flex items-center justify-between gap-6">
                    <Skeleton class="h-10 w-32 max-w-2/5" />
                    <Skeleton class="h-12 w-32 max-w-2/5" />
                </div>
                <Skeleton class="mx-auto h-7 w-3/4" />
                <div v-for="section in 3" :key="section" class="flex min-w-0 flex-col gap-3">
                    <Skeleton class="h-5 w-1/2 max-w-full" />
                    <div class="overflow-hidden rounded-sm ring-1 ring-surface-ring">
                        <div v-for="row in section === 1 ? 4 : 2" :key="row" class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 border-b p-2 last:border-b-0">
                            <Skeleton class="h-3.5 w-3/4" />
                            <Skeleton class="h-3.5 w-full" />
                        </div>
                    </div>
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
                <div v-for="side in 2" :key="side" class="flex min-w-0 flex-col gap-4 rounded-md ring-1 ring-surface-ring p-4">
                    <Skeleton class="h-5 w-28 max-w-full" />
                    <div class="flex flex-col gap-3">
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
                <Skeleton v-if="notice === 1" class="h-4 w-5/6" />
            </AlertDescription>
        </Alert>
        <TableLoadingSkeleton :rows="rows" :columns="4" :actions="false" :cell-lines="[2, 1, 1, 1]" search :filters="1" />
    </template>
</template>
