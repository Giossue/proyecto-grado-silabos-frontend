<script setup lang="ts">
import { Spinner } from '@/components/ui/spinner';

export type TemplateComparison = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: string[] };

defineProps<{ comparison: TemplateComparison }>();
</script>

<template>
    <span v-if="comparison.status === 'loading'" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Comparando…</span>
    <p v-else-if="comparison.status === 'error'" class="text-sm text-destructive">{{ comparison.message }}</p>
    <p v-else-if="comparison.items.length === 0" class="text-sm text-muted-foreground">Igual a la plantilla actual</p>
    <div v-else class="flex flex-col gap-1 text-sm">
        <span class="text-muted-foreground">Cambios desde esta versión hasta la actual:</span>
        <ul class="list-disc pl-5">
            <li v-for="change in comparison.items" :key="change">{{ change }}</li>
        </ul>
    </div>
</template>
