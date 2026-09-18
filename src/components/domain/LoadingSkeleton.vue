<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';

type LoadingVariant =
    | 'table'
    | 'table-body'
    | 'table-detail'
    | 'audit'
    | 'detail'
    | 'form'
    | 'document'
    | 'dashboard'
    | 'academic'
    | 'catalog'
    | 'academic-structure'
    | 'notifications'
    | 'workspace'
    | 'syllabus'
    | 'review'
    | 'documents'
    | 'source'
    | 'template'
    | 'report'
    | 'comparison';

const props = withDefaults(
    defineProps<{
        variant?: LoadingVariant;
        rows?: number;
        columns?: number;
        mode?: 'curriculum' | 'schedule' | 'teachers';
    }>(),
    {
        variant: 'table',
        rows: 5,
        columns: 6,
    },
);

const columnCount = (): number => Math.max(props.columns, 2);
const gridColumns = (): string =>
    `minmax(12rem, 2fr) repeat(${columnCount() - 1}, minmax(7rem, 1fr))`;
</script>

<template>
    <div
        class="flex w-full min-w-0 flex-col gap-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Cargando contenido"
    >
        <span class="sr-only">Cargando contenido…</span>
        <div aria-hidden="true" class="contents">
            <!-- Listados que todavía no tienen su Card ni su barra de filtros. -->
            <template v-if="variant === 'table'">
                <div class="overflow-hidden rounded-xl border bg-card">
                    <div class="border-b p-4">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <Skeleton class="h-10 min-w-0 flex-1" />
                            <div class="grid gap-3 sm:grid-cols-2 lg:flex">
                                <Skeleton class="h-10 w-full sm:w-44" />
                                <Skeleton class="h-10 w-full sm:w-44" />
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto p-3">
                        <div class="min-w-[58rem] overflow-hidden rounded-lg border">
                            <div
                                class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                                :style="{ gridTemplateColumns: gridColumns() }"
                            >
                                <Skeleton v-for="column in columnCount()" :key="`header-${column}`" class="h-4 w-3/4" />
                            </div>
                            <div class="flex flex-col gap-px bg-border">
                                <div
                                    v-for="row in props.rows"
                                    :key="`row-${row}`"
                                    class="grid gap-3 bg-background px-3 py-4"
                                    :style="{ gridTemplateColumns: gridColumns() }"
                                >
                                    <Skeleton v-for="column in columnCount()" :key="`cell-${row}-${column}`" class="h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between border-t px-4 py-3">
                        <Skeleton class="h-4 w-40" />
                        <Skeleton class="h-9 w-32" />
                    </div>
                </div>
            </template>

            <!-- Tablas dentro de una Card que ya dibujó filtros y encabezado. -->
            <template v-else-if="variant === 'table-body'">
                <div class="overflow-x-auto">
                    <div class="min-w-[48rem] overflow-hidden rounded-lg border">
                        <div
                            class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                            :style="{ gridTemplateColumns: gridColumns() }"
                        >
                            <Skeleton v-for="column in columnCount()" :key="`header-${column}`" class="h-4 w-3/4" />
                        </div>
                        <div class="flex flex-col gap-px bg-border">
                            <div
                                v-for="row in props.rows"
                                :key="`row-${row}`"
                                class="grid gap-3 bg-background px-3 py-4"
                                :style="{ gridTemplateColumns: gridColumns() }"
                            >
                                <Skeleton v-for="column in columnCount()" :key="`cell-${row}-${column}`" class="h-4 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <Skeleton class="h-4 w-40" />
                    <Skeleton class="h-9 w-32" />
                </div>
            </template>

            <!-- Historiales que muestran el título de la Card antes de la tabla. -->
            <template v-else-if="variant === 'table-detail'">
                <div class="overflow-hidden rounded-xl border bg-card">
                    <div class="grid gap-1.5 px-6 py-6">
                        <Skeleton class="h-6 w-52" />
                        <Skeleton class="h-4 w-80 max-w-full" />
                    </div>
                    <div class="flex flex-col gap-4 px-6 pb-6">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <Skeleton class="h-10 min-w-0 flex-1" />
                            <Skeleton class="h-10 w-full sm:w-44" />
                        </div>
                        <div class="overflow-x-auto">
                            <div class="min-w-[32rem] overflow-hidden rounded-lg border">
                                <div
                                    class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                                    :style="{ gridTemplateColumns: gridColumns() }"
                                >
                                    <Skeleton v-for="column in columnCount()" :key="`detail-header-${column}`" class="h-4 w-3/4" />
                                </div>
                                <div class="flex flex-col gap-px bg-border">
                                    <div
                                        v-for="row in props.rows"
                                        :key="`detail-row-${row}`"
                                        class="grid gap-3 bg-background px-3 py-4"
                                        :style="{ gridTemplateColumns: gridColumns() }"
                                    >
                                        <Skeleton v-for="column in columnCount()" :key="`detail-cell-${row}-${column}`" class="h-4 w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <Skeleton class="h-4 w-40" />
                            <Skeleton class="h-9 w-32" />
                        </div>
                    </div>
                </div>
            </template>

            <!-- Auditoría: pestañas visibles y tabla dentro de una Card. -->
            <template v-else-if="variant === 'audit'">
                <div class="bg-muted inline-flex h-9 w-fit items-center gap-1 rounded-lg p-0.75">
                    <Skeleton class="h-7 w-24 rounded-md" />
                    <Skeleton class="h-7 w-36 rounded-md" />
                </div>
                <div class="overflow-hidden rounded-xl border bg-card p-6">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <Skeleton class="h-10 min-w-0 flex-1" />
                            <div class="grid gap-3 sm:grid-cols-3 lg:flex">
                                <Skeleton v-for="filter in 3" :key="`audit-filter-${filter}`" class="h-10 w-full sm:w-40" />
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <div class="min-w-[64rem] overflow-hidden rounded-lg border">
                                <div
                                    class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                                    :style="{ gridTemplateColumns: gridColumns() }"
                                >
                                    <Skeleton v-for="column in columnCount()" :key="`audit-header-${column}`" class="h-4 w-3/4" />
                                </div>
                                <div class="flex flex-col gap-px bg-border">
                                    <div
                                        v-for="row in props.rows"
                                        :key="`audit-row-${row}`"
                                        class="grid gap-3 bg-background px-3 py-4"
                                        :style="{ gridTemplateColumns: gridColumns() }"
                                    >
                                        <Skeleton v-for="column in columnCount()" :key="`audit-cell-${row}-${column}`" class="h-4 w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <Skeleton class="h-4 w-40" />
                            <Skeleton class="h-9 w-32" />
                        </div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'dashboard'">
                <div class="rounded-xl border bg-card p-5">
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex min-w-0 flex-col gap-2">
                                <Skeleton class="h-5 w-48" />
                                <Skeleton class="h-4 w-72 max-w-full" />
                            </div>
                            <Skeleton class="h-9 w-24" />
                        </div>
                        <Skeleton class="h-3 w-full" />
                        <div class="grid gap-3 sm:grid-cols-3">
                            <Skeleton v-for="step in 3" :key="`setup-${step}`" class="h-16 w-full" />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <div v-for="tile in 4" :key="`tile-${tile}`" class="rounded-xl border bg-card p-4">
                        <div class="flex items-start justify-between gap-3">
                            <Skeleton class="h-4 w-24" />
                            <Skeleton class="size-9 rounded-lg" />
                        </div>
                        <Skeleton class="mt-4 h-8 w-20" />
                        <Skeleton class="mt-2 h-3 w-32" />
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'academic'">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <Skeleton class="h-10 w-64" />
                    <div class="flex gap-2">
                        <Skeleton class="h-10 w-32" />
                        <Skeleton class="h-10 w-36" />
                    </div>
                </div>
                <div class="rounded-xl border bg-card p-5">
                    <div class="flex flex-col gap-3 border-b pb-5">
                        <Skeleton class="h-6 w-56" />
                        <Skeleton class="h-4 w-96 max-w-full" />
                    </div>
                    <div class="mt-5 overflow-hidden rounded-lg border">
                        <div class="grid grid-cols-4 gap-3 border-b bg-muted/40 px-3 py-3">
                            <Skeleton v-for="column in 4" :key="`academic-header-${column}`" class="h-4 w-3/4" />
                        </div>
                        <div class="flex flex-col gap-px bg-border">
                            <div v-for="row in 5" :key="`academic-row-${row}`" class="grid grid-cols-4 gap-3 bg-background px-3 py-4">
                                <Skeleton v-for="column in 4" :key="`academic-cell-${row}-${column}`" class="h-4 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Catálogos institucionales: la página solo añade una Card con filtro y tabla. -->
            <template v-else-if="variant === 'catalog'">
                <div class="overflow-hidden rounded-xl border bg-card p-6">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <Skeleton class="h-10 min-w-0 flex-1" />
                            <Skeleton class="h-10 w-full sm:w-44" />
                        </div>
                        <div class="overflow-x-auto">
                            <div class="min-w-[42rem] overflow-hidden rounded-lg border">
                                <div
                                    class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                                    :style="{ gridTemplateColumns: gridColumns() }"
                                >
                                    <Skeleton v-for="column in columnCount()" :key="`catalog-header-${column}`" class="h-4 w-3/4" />
                                </div>
                                <div class="flex flex-col gap-px bg-border">
                                    <div
                                        v-for="row in props.rows"
                                        :key="`catalog-row-${row}`"
                                        class="grid gap-3 bg-background px-3 py-4"
                                        :style="{ gridTemplateColumns: gridColumns() }"
                                    >
                                        <Skeleton v-for="column in columnCount()" :key="`catalog-cell-${row}-${column}`" class="h-4 w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <Skeleton class="h-4 w-40" />
                            <Skeleton class="h-9 w-32" />
                        </div>
                    </div>
                </div>
            </template>

            <!-- Estructura académica: cambia la tabla según el modo solicitado. -->
            <template v-else-if="variant === 'academic-structure'">
                <template v-if="props.mode === 'curriculum'">
                    <div class="flex items-center justify-between gap-3">
                        <div class="bg-muted inline-flex h-9 w-fit items-center gap-1 rounded-lg p-0.75">
                            <Skeleton class="h-7 w-28 rounded-md" />
                            <Skeleton class="h-7 w-44 rounded-md" />
                        </div>
                        <div class="flex gap-2"><Skeleton class="h-9 w-28" /><Skeleton class="h-9 w-32" /></div>
                    </div>
                    <div class="rounded-xl border bg-card p-6">
                        <div class="flex flex-col gap-3"><Skeleton class="h-6 w-64" /><Skeleton class="h-4 w-96 max-w-full" /><Skeleton class="mt-3 h-72 w-full" /></div>
                    </div>
                </template>
                <div v-else class="overflow-hidden rounded-xl border bg-card p-6">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-end"><Skeleton class="h-10 min-w-0 flex-1" /><Skeleton class="h-10 w-full sm:w-52" /></div>
                        <div class="overflow-x-auto">
                            <div class="min-w-[48rem] overflow-hidden rounded-lg border">
                                <div
                                    class="grid items-center gap-3 border-b bg-muted/40 px-3 py-3"
                                    :style="{ gridTemplateColumns: gridColumns() }"
                                >
                                    <Skeleton v-for="column in columnCount()" :key="`structure-header-${column}`" class="h-4 w-3/4" />
                                </div>
                                <div class="flex flex-col gap-px bg-border">
                                    <div v-for="row in props.rows" :key="`structure-row-${row}`" class="grid gap-3 bg-background px-3 py-4" :style="{ gridTemplateColumns: gridColumns() }"><Skeleton v-for="column in columnCount()" :key="`structure-cell-${row}-${column}`" class="h-4 w-full" /></div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between"><Skeleton class="h-4 w-40" /><Skeleton class="h-9 w-32" /></div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'notifications'">
                <div class="rounded-xl border bg-card p-4">
                    <div class="flex flex-col gap-4">
                        <div v-for="notification in props.rows" :key="`notification-${notification}`" class="rounded-lg border p-4">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div class="flex min-w-0 flex-1 flex-col gap-2">
                                    <Skeleton class="h-5 w-56 max-w-full" />
                                    <Skeleton class="h-4 w-full" />
                                    <Skeleton class="h-3 w-32" />
                                </div>
                                <div class="flex gap-2">
                                    <Skeleton class="h-9 w-28" />
                                    <Skeleton class="h-9 w-32" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'workspace'">
                <div class="mx-auto w-full max-w-6xl">
                    <div class="flex flex-col gap-3">
                        <Skeleton class="h-4 w-72" />
                        <Skeleton class="h-5 w-96 max-w-full" />
                    </div>
                    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div v-for="card in 3" :key="`workspace-${card}`" class="flex min-h-36 flex-col justify-between rounded-xl border bg-card p-5">
                            <div class="flex items-start justify-between gap-3">
                                <Skeleton class="h-6 w-40" />
                                <Skeleton class="h-6 w-20" />
                            </div>
                            <Skeleton class="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'syllabus'">
                <div class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <main class="flex min-w-0 flex-col gap-8">
                        <div class="flex flex-col gap-2 border-t pt-8 first:border-t-0 first:pt-0">
                            <Skeleton class="h-6 w-64" />
                            <Skeleton class="h-4 w-96 max-w-full" />
                        </div>
                        <div v-for="section in 4" :key="`syllabus-section-${section}`" class="flex flex-col gap-5 border-t pt-8">
                            <div class="flex flex-col gap-2">
                                <Skeleton class="h-6 w-56" />
                                <Skeleton class="h-4 w-80 max-w-full" />
                            </div>
                            <div class="flex flex-col gap-4">
                                <Skeleton class="h-4 w-48" />
                                <Skeleton class="h-10 w-full" />
                                <Skeleton class="h-32 w-full" />
                            </div>
                        </div>
                    </main>
                    <aside class="flex min-w-0 flex-col gap-6 self-start">
                        <div class="rounded-xl border bg-card p-5">
                            <div class="flex flex-col gap-3">
                                <Skeleton class="h-6 w-40" />
                                <Skeleton class="h-4 w-full" />
                                <Skeleton class="h-24 w-full" />
                                <Skeleton class="h-10 w-full" />
                            </div>
                        </div>
                    </aside>
                </div>
            </template>

            <template v-else-if="variant === 'review'">
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-8 w-72 max-w-full" />
                    <Skeleton class="h-4 w-96 max-w-full" />
                </div>
                <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
                    <main class="flex min-w-0 flex-col gap-6">
                        <div v-for="card in 3" :key="`review-card-${card}`" class="rounded-xl border bg-card p-5">
                            <div class="flex flex-col gap-3 border-b pb-5">
                                <Skeleton class="h-6 w-56" />
                                <Skeleton class="h-4 w-80 max-w-full" />
                            </div>
                            <div class="mt-5 flex flex-col gap-3">
                                <Skeleton class="h-4 w-44" />
                                <Skeleton class="h-24 w-full" />
                                <Skeleton class="h-20 w-full" />
                            </div>
                        </div>
                    </main>
                    <aside class="rounded-xl border bg-card p-5">
                        <div class="flex flex-col gap-4">
                            <Skeleton class="h-6 w-44" />
                            <Skeleton v-for="item in 3" :key="`review-observation-${item}`" class="h-24 w-full" />
                        </div>
                    </aside>
                </div>
            </template>

            <template v-else-if="variant === 'documents'">
                <Skeleton class="h-20 w-full rounded-xl" />
                <Skeleton class="h-16 w-full rounded-xl" />
                <div class="overflow-hidden rounded-xl border bg-card">
                    <div class="border-b p-4"><Skeleton class="h-10 w-80 max-w-full" /></div>
                    <div class="overflow-x-auto p-3">
                        <div class="min-w-[42rem] overflow-hidden rounded-lg border">
                            <div class="grid grid-cols-4 gap-3 border-b bg-muted/40 px-3 py-3"><Skeleton v-for="column in 4" :key="`documents-header-${column}`" class="h-4 w-3/4" /></div>
                            <div class="flex flex-col gap-px bg-border"><div v-for="row in 4" :key="`documents-row-${row}`" class="grid grid-cols-4 gap-3 bg-background px-3 py-4"><Skeleton v-for="column in 4" :key="`documents-cell-${row}-${column}`" class="h-4 w-full" /></div></div>
                        </div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'source'">
                <div class="rounded-xl border bg-card p-5">
                    <div class="flex flex-col gap-3 border-b pb-5">
                        <Skeleton class="h-6 w-56" />
                        <Skeleton class="h-4 w-96 max-w-full" />
                    </div>
                    <Skeleton class="mt-5 h-[28rem] w-full" />
                    <div class="mt-4 flex justify-end"><Skeleton class="h-10 w-40" /></div>
                </div>
            </template>

            <template v-else-if="variant === 'template'">
                <div class="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
                    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                        <Skeleton class="h-9 w-32" />
                        <Skeleton class="h-5 w-48 justify-self-center" />
                        <Skeleton class="h-9 w-20" />
                    </div>
                </div>
                <div class="flex justify-center px-4 py-6 sm:py-8">
                    <div class="w-full max-w-[56rem] overflow-hidden border bg-card p-6 shadow-sm sm:p-10">
                        <div class="flex flex-col gap-8">
                            <div class="flex items-center justify-between"><Skeleton class="h-12 w-40" /><Skeleton class="h-12 w-40" /></div>
                            <Skeleton class="mx-auto h-8 w-96 max-w-full" />
                            <Skeleton v-for="block in 6" :key="`template-block-${block}`" class="h-24 w-full" />
                        </div>
                    </div>
                </div>
            </template>

            <template v-else-if="variant === 'report'">
                <div class="rounded-xl border bg-card p-5">
                    <div class="flex flex-col gap-4">
                        <Skeleton class="h-6 w-48" />
                        <Skeleton class="h-4 w-96 max-w-full" />
                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"><Skeleton v-for="control in 4" :key="`report-control-${control}`" class="h-10 w-full" /></div>
                    </div>
                </div>
                <div v-for="card in 2" :key="`report-card-${card}`" class="rounded-xl border bg-card p-5">
                    <div class="flex flex-col gap-2"><Skeleton class="h-6 w-56" /><Skeleton class="h-4 w-80 max-w-full" /></div>
                    <div class="mt-5 overflow-hidden rounded-lg border"><Skeleton class="h-10 w-full rounded-none" /><div class="flex flex-col gap-px bg-border"><Skeleton v-for="row in 4" :key="`report-row-${card}-${row}`" class="h-14 w-full rounded-none" /></div></div>
                </div>
            </template>


            <!-- Comparación: resumen y tarjetas de cambios con dos columnas. -->
            <template v-else-if="variant === 'comparison'">
                <div class="rounded-xl border bg-card p-6">
                    <div class="flex flex-col gap-2"><Skeleton class="h-6 w-72 max-w-full" /><Skeleton class="h-4 w-96 max-w-full" /></div>
                </div>
                <div v-for="change in 3" :key="`comparison-${change}`" class="rounded-xl border bg-card p-6">
                    <div class="flex items-start justify-between gap-4 border-b pb-5"><div class="flex min-w-0 flex-col gap-2"><Skeleton class="h-4 w-40" /><Skeleton class="h-6 w-64 max-w-full" /></div><Skeleton class="h-6 w-28" /></div>
                    <div class="mt-5 grid gap-4 lg:grid-cols-2"><div class="rounded-md border p-4"><Skeleton class="h-5 w-40" /><Skeleton class="mt-3 h-24 w-full" /></div><div class="rounded-md border p-4"><Skeleton class="h-5 w-40" /><Skeleton class="mt-3 h-24 w-full" /></div></div>
                </div>
            </template>

            <!-- Formulario simple y detalle pequeño, conservados para pantallas menores. -->
            <template v-else-if="variant === 'form'">
                <div v-for="row in props.rows" :key="`form-${row}`" class="flex flex-col gap-2">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-10 w-full" />
                </div>
            </template>

            <template v-else-if="variant === 'detail'">
                <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                    <div class="rounded-xl border bg-card p-5">
                        <div class="flex flex-col gap-3 border-b pb-5"><Skeleton class="h-6 w-64" /><Skeleton class="h-4 w-96 max-w-full" /></div>
                        <div class="mt-5 flex flex-col gap-4"><Skeleton v-for="row in 5" :key="`detail-row-${row}`" class="h-14 w-full" /></div>
                    </div>
                    <div class="rounded-xl border bg-card p-5"><div class="flex flex-col gap-4"><Skeleton class="h-6 w-44" /><Skeleton v-for="row in 4" :key="`detail-side-${row}`" class="h-16 w-full" /></div></div>
                </div>
            </template>

            <template v-else>
                <Skeleton class="h-8 w-1/2" />
                <Skeleton class="h-5 w-3/4" />
                <Skeleton class="h-72 w-full" />
                <Skeleton class="h-40 w-full" />
            </template>
        </div>
    </div>
</template>
