<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';

type LoadingVariant = 'table' | 'detail' | 'form' | 'document' | 'dashboard' | 'academic';

withDefaults(defineProps<{ variant?: LoadingVariant; rows?: number }>(), {
    variant: 'table',
    rows: 5,
});
</script>

<template>
    <div
        class="flex w-full flex-col gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Cargando contenido"
    >
        <span class="sr-only">Cargando contenido…</span>
        <div aria-hidden="true" class="contents">

        <template v-if="variant === 'dashboard'">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton v-for="index in 4" :key="index" class="h-28 w-full" />
            </div>
            <Skeleton class="h-44 w-full" />
        </template>

        <template v-else-if="variant === 'academic'">
            <Skeleton class="h-10 w-2/3" />
            <Skeleton class="h-64 w-full" />
            <div class="grid gap-4 sm:grid-cols-2">
                <Skeleton v-for="index in 4" :key="index" class="h-24 w-full" />
            </div>
        </template>

        <template v-else-if="variant === 'form'">
            <div v-for="index in rows" :key="index" class="grid gap-2">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-10 w-full" />
            </div>
        </template>

        <template v-else-if="variant === 'detail'">
            <Skeleton class="h-20 w-full" />
            <div class="grid gap-4 sm:grid-cols-2">
                <Skeleton v-for="index in rows" :key="index" class="h-24 w-full" />
            </div>
        </template>

        <template v-else-if="variant === 'document'">
            <Skeleton class="h-8 w-1/2" />
            <Skeleton class="h-5 w-3/4" />
            <Skeleton class="h-72 w-full" />
            <Skeleton class="h-40 w-full" />
        </template>

        <template v-else>
            <div class="grid gap-3 sm:grid-cols-3">
                <Skeleton v-for="index in 3" :key="index" class="h-10 w-full" />
            </div>
            <div class="overflow-hidden rounded-lg border">
                <Skeleton class="h-10 w-full rounded-none" />
                <div class="flex flex-col gap-px bg-border">
                    <Skeleton v-for="index in rows" :key="index" class="h-12 w-full rounded-none bg-background" />
                </div>
            </div>
        </template>
        </div>
    </div>
</template>
