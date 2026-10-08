<script setup lang="ts">
import { computed } from 'vue';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { syllabusStateLabel } from '@/lib/syllabusStates';

const props = defineProps<{ state: string }>();

const variants: Record<string, NonNullable<BadgeVariants['variant']>> = {
    sin_iniciar: 'neutral',
    borrador: 'secondary',
    en_revision: 'warning',
    correccion_solicitada: 'danger',
    aprobado: 'success',
};
const variant = computed(() => variants[props.state] ?? 'outline');
</script>

<template>
    <Badge :variant="variant">{{ syllabusStateLabel(state) }}</Badge>
</template>
