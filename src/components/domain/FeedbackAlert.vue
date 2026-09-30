<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

withDefaults(defineProps<{ message: string; title?: string; variant?: 'default' | 'destructive' }>(), { variant: 'destructive' });
</script>

<template>
    <Alert :variant="variant">
        <AlertTitle v-if="title">{{ title }}</AlertTitle>
        <AlertDescription>{{ message }}<slot /></AlertDescription>
    </Alert>
</template>
