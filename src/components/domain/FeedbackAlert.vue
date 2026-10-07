<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle, type AlertVariants } from '@/components/ui/alert';

withDefaults(defineProps<{
    message: string;
    title?: string;
    variant?: AlertVariants['variant'];
    appearance?: AlertVariants['appearance'];
}>(), { variant: 'destructive', appearance: 'default' });
</script>

<template>
    <Alert :variant="variant" :appearance="appearance">
        <AlertTitle v-if="title">{{ title }}</AlertTitle>
        <AlertDescription>{{ message }}<slot /></AlertDescription>
    </Alert>
</template>
