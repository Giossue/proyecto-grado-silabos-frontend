<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
</script>

<template>
    <div data-skeleton="metrics" class="grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
        <Card v-for="metric in 3" :key="metric" class="min-w-0 py-4">
            <CardContent class="flex min-w-0 flex-col gap-0.5">
                <div class="flex items-center gap-2">
                    <Skeleton class="size-4 shrink-0" />
                    <Skeleton class="h-4 w-28 max-w-full" />
                </div>
                <Skeleton class="h-6 w-16" />
                <Skeleton class="h-3 w-4/5" />
            </CardContent>
        </Card>
    </div>
</template>
