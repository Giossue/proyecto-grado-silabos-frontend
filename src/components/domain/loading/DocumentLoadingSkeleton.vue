<script setup lang="ts">
import { computed } from 'vue';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import TableLoadingSkeleton from '@/components/domain/loading/TableLoadingSkeleton.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DOCUMENT_DEFAULTS } from '@/lib/documentDefaults';
import { LETTER_PAGE } from '@/lib/documentPagination';
import { cn } from '@/lib/utils';

const props = withDefaults(
    defineProps<{
        variant: 'syllabus' | 'review' | 'template' | 'comparison' | 'documents';
        rows?: number;
        reviewStage?: 'coordination' | 'library' | 'dean';
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
        : props.reviewStage === 'dean'
            ? ['observations', 'correction', 'approval', 'history']
            : ['observations', 'approval', 'history'],
);

const pageStyle = {
    width: `${LETTER_PAGE.width}px`,
    minHeight: `${LETTER_PAGE.height}px`,
    padding: `${DOCUMENT_DEFAULTS.marginCm * 96 / 2.54}px`,
};
</script>

<template>
    <template v-if="variant === 'syllabus'">
        <WorkspaceLayout variant="syllabus">
            <main class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
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

                <template v-for="section in sectionCount" :key="`syllabus-section-${section}`">
                    <Separator v-if="section > 1" />
                    <Card data-skeleton="syllabus-section">
                        <CardHeader class="min-w-0 grid-cols-1">
                            <Skeleton class="h-6 w-56 max-w-full" />
                            <Skeleton class="h-4 w-80 max-w-full" />
                        </CardHeader>
                        <CardContent class="flex min-w-0 flex-col gap-6">
                            <Card v-if="section === 1" data-skeleton="academic-context">
                                <CardContent class="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
                                    <div v-for="(items, group) in [7, 6, 5, 2]" :key="group" class="flex min-w-0 flex-col gap-3">
                                        <Skeleton class="h-4 w-28 max-w-full" />
                                        <div v-for="item in items" :key="item" class="flex min-w-0 flex-col gap-1">
                                            <Skeleton class="h-3 w-2/3" />
                                            <Skeleton class="h-5 w-full" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div class="flex min-w-0 flex-col gap-3">
                                <Skeleton class="h-4 w-48 max-w-full" />
                                <Skeleton :class="cn('w-full', readonly ? 'h-16' : 'h-9')" />
                            </div>
                            <div v-if="section > 1" class="flex min-w-0 flex-col gap-3">
                                <Skeleton class="h-4 w-40 max-w-full" />
                                <div class="overflow-hidden rounded-md border">
                                    <div v-if="!readonly" class="flex flex-wrap gap-2 border-b px-3 py-2">
                                        <Skeleton v-for="control in 5" :key="control" class="size-7" />
                                    </div>
                                    <div class="flex min-h-32 flex-col gap-3 p-4">
                                        <Skeleton class="h-4 w-full" />
                                        <Skeleton class="h-4 w-5/6" />
                                        <Skeleton class="h-4 w-2/3" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </template>
            </main>

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
                        <div class="flex flex-col gap-3 rounded-md border p-3">
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
                <Skeleton class="size-11 shrink-0 rounded-lg" />
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
            <main class="flex min-w-0 flex-col gap-6">
                <Card v-for="section in reviewSections" :key="section" data-skeleton="review-section">
                    <CardHeader class="min-w-0 grid-cols-1">
                        <Skeleton class="h-5 w-52 max-w-full" />
                        <Skeleton class="h-4 w-80 max-w-full" />
                    </CardHeader>
                    <CardContent class="flex min-w-0 flex-col gap-6">
                        <div v-for="field in 2" :key="field" class="flex min-w-0 flex-col gap-3 rounded-md border p-4">
                            <Skeleton class="h-5 w-44 max-w-full" />
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-5/6" />
                            <Skeleton class="h-4 w-2/3" />
                        </div>
                    </CardContent>
                </Card>
            </main>

            <aside class="flex min-w-0 flex-col gap-6" :data-review-stage="reviewStage">
                <Skeleton v-if="reviewStage === 'coordination'" class="h-9 w-full" data-skeleton="new-observation" />
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
                            <div v-for="item in panel === 'history' ? 2 : 1" :key="item" class="flex min-w-0 flex-col gap-3 rounded-md border p-3">
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

    <div v-else-if="variant === 'template'" class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6">
        <header class="flex min-w-0 items-start justify-between gap-4" data-skeleton="template-heading">
            <div class="flex min-w-0 items-start gap-3">
                <Skeleton class="size-11 shrink-0 rounded-lg" />
                <div class="flex min-w-0 flex-col gap-2">
                    <Skeleton class="h-8 w-64 max-w-full" />
                    <Skeleton class="h-5 w-80 max-w-full" />
                </div>
            </div>
            <Skeleton class="hidden h-9 w-24 shrink-0 sm:block" />
        </header>
        <div class="min-w-0 overflow-x-auto p-1 pb-4" data-skeleton="template-pages">
            <div class="flex min-w-max flex-col gap-6">
                <div v-for="page in 2" :key="page" class="relative mx-auto shrink-0 bg-(--document-paper) shadow-(--document-paper-shadow)" :style="pageStyle" data-skeleton="template-page">
                    <div class="flex flex-col gap-8">
                        <template v-if="page === 1">
                            <div class="flex items-center justify-between gap-6">
                                <Skeleton class="h-10 w-32" />
                                <Skeleton class="h-14 w-32" />
                            </div>
                            <Skeleton class="h-8 w-5/6" />
                        </template>
                        <div v-for="section in page === 1 ? 2 : 3" :key="section" class="flex flex-col gap-4">
                            <Skeleton class="h-5 w-1/2" />
                            <div class="overflow-hidden border">
                                <div class="grid grid-cols-3 gap-3 border-b bg-muted/30 p-3">
                                    <Skeleton v-for="column in 3" :key="column" class="h-4 w-3/4" />
                                </div>
                                <div v-for="row in 4" :key="row" class="grid grid-cols-3 gap-3 border-b p-3 last:border-b-0">
                                    <Skeleton v-for="column in 3" :key="column" class="h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <Skeleton class="absolute bottom-(--document-page-number-inset) size-3" :style="{ right: pageStyle.padding }" />
                </div>
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
                <div v-for="side in 2" :key="side" class="flex min-w-0 flex-col gap-4 rounded-md border p-4">
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
        <Card>
            <CardContent class="flex min-w-0 flex-col gap-4">
                <TableLoadingSkeleton :rows="rows" :columns="4" :cell-lines="2" search :filters="1" />
            </CardContent>
        </Card>
    </template>
</template>
