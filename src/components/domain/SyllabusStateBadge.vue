<script setup lang="ts">
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import { syllabusStateLabel } from '@/lib/syllabusStates';

defineProps<{ state: string }>();

const tones: Record<string, StatusTone> = {
    sin_iniciar: 'neutral',
    borrador: 'info',
    en_revision: 'warning',
    correccion_solicitada: 'danger',
    aprobado: 'success',
};
</script>

<template>
    <StatusBadge :label="syllabusStateLabel(state)" :tone="tones[state] ?? 'neutral'" />
</template>
