<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

defineProps<{ message: string; title?: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
    <Alert variant="destructive">
        <AlertTitle>{{ title ?? 'No se pudo cargar esta información' }}</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center justify-between gap-3">
            <span>{{ message }}</span>
            <Button type="button" size="sm" variant="outline" @click="emit('retry')">
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Reintentar
            </Button>
        </AlertDescription>
    </Alert>
</template>
