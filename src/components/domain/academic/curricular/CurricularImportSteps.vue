<script setup lang="ts">
import StepProgress from '@/components/domain/StepProgress.vue';

defineProps<{ current: 1 | 2 | 3 | 4; failed?: boolean }>();
const steps = ['Documentos', 'Análisis', 'Revisión', 'Listo'] as const;
</script>

<template>
    <StepProgress :steps="steps" :current="current" :failed="failed" label="Pasos de la importación" />
</template>
