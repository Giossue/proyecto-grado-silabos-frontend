<script setup lang="ts">
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

defineProps<{ steps: number }>();
</script>

<template>
    <Card data-skeleton="setup">
        <CardHeader class="gap-2">
            <Skeleton class="h-5 w-64 max-w-full" />
            <Skeleton class="h-4 w-4/5" />
            <div class="flex items-center gap-3 pt-1">
                <Skeleton class="h-2 min-w-0 flex-1 rounded-full" />
                <Skeleton class="h-4 w-12" />
            </div>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
            <div v-for="step in steps" :key="step" class="flex items-start gap-3 rounded-md p-2">
                <Skeleton class="mt-0.5 size-6 shrink-0 rounded-full" />
                <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton class="h-4 w-3/4" />
                    <Skeleton class="h-4 w-full" />
                </div>
                <Skeleton v-if="step === 1" class="h-8 w-12 shrink-0 sm:w-24" />
            </div>
        </CardContent>
    </Card>
</template>
