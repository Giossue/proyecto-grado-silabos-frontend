<script setup lang="ts">
import MetricsLoadingSkeleton from '@/components/domain/loading/MetricsLoadingSkeleton.vue';
import SetupLoadingSkeleton from '@/components/domain/loading/SetupLoadingSkeleton.vue';
</script>

<template>
    <div class="flex min-w-0 flex-col gap-6">
        <MetricsLoadingSkeleton />
        <SetupLoadingSkeleton :steps="6" />
    </div>
</template>
