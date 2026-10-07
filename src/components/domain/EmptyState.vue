<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

defineProps<{ title: string; description?: string }>();
</script>

<template>
    <Empty>
        <EmptyHeader>
            <EmptyTitle>{{ withoutEndPeriod(title) }}</EmptyTitle>
            <EmptyDescription v-if="description">{{ withoutEndPeriod(description) }}</EmptyDescription>
        </EmptyHeader>
        <slot />
    </Empty>
</template>
