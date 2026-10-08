<script setup lang="ts">
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

defineProps<{ label: string; tone: StatusTone }>();

const variants = { neutral: 'neutral', info: 'secondary', warning: 'warning', danger: 'danger', success: 'success' } as const;
</script>

<template>
    <Badge :variant="variants[tone]">{{ label }}</Badge>
</template>
