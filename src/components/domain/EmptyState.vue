<script setup lang="ts">
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

defineProps<{ title: string; description?: string }>();
</script>

<template>
    <Empty>
        <EmptyHeader>
            <EmptyTitle>{{ title }}</EmptyTitle>
            <EmptyDescription v-if="description">{{ description }}</EmptyDescription>
        </EmptyHeader>
        <slot />
    </Empty>
</template>
