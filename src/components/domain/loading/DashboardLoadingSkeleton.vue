<script setup lang="ts">
import { computed } from 'vue';
import type { RoleCode } from '@/api/session';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const props = withDefaults(defineProps<{ role?: RoleCode }>(), {
    role: 'administrador',
});

const metricCount = computed(() => props.role === 'docente' ? 2 : 3);
const stepCount = computed(() => ({ administrador: 7, coordinador: 5, docente: 4, bibliotecario: 0 })[props.role]);
const hasDeadline = computed(() => props.role === 'coordinador' || props.role === 'docente');
</script>

<template>
    <div class="flex min-w-0 flex-col gap-6">
        <div v-if="metricCount > 0" data-skeleton="dashboard-metrics" class="grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
            <Card v-for="metric in metricCount" :key="metric" class="min-w-0">
                <CardContent class="flex min-w-0 flex-col gap-0.5 py-3">
                    <div class="flex items-center gap-2">
                        <Skeleton class="size-4 shrink-0" />
                        <Skeleton class="h-4 w-28 max-w-full" />
                    </div>
                    <Skeleton class="h-6 w-16" />
                    <Skeleton class="h-3 w-4/5" />
                </CardContent>
            </Card>
        </div>

        <Card v-if="hasDeadline" data-skeleton="dashboard-deadline">
            <CardHeader>
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex min-w-0 flex-col gap-2">
                        <Skeleton class="h-5 w-56 max-w-full" />
                        <Skeleton class="h-4 w-40" />
                    </div>
                    <Skeleton class="h-4 w-20" />
                </div>
            </CardHeader>
            <CardContent class="flex flex-col gap-5">
                <Skeleton class="h-6 w-64 max-w-full" />
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between gap-4">
                        <div v-for="date in 2" :key="date" class="flex min-w-0 flex-col gap-1">
                            <Skeleton class="h-3 w-12" />
                            <Skeleton class="h-4 w-36 max-w-full" />
                        </div>
                    </div>
                    <Skeleton class="h-2 w-full rounded-full" />
                </div>
            </CardContent>
            <CardFooter><Skeleton class="h-9 w-full sm:w-44" /></CardFooter>
        </Card>

        <Card v-if="stepCount > 0" data-skeleton="dashboard-setup">
            <CardHeader class="gap-2">
                <Skeleton class="h-5 w-64 max-w-full" />
                <Skeleton class="h-4 w-4/5" />
                <div class="flex items-center gap-3 pt-1">
                    <Skeleton class="h-2 min-w-0 flex-1 rounded-full" />
                    <Skeleton class="h-4 w-12" />
                </div>
            </CardHeader>
            <CardContent class="flex flex-col gap-2">
                <div v-for="step in stepCount" :key="step" class="flex items-start gap-3 rounded-lg p-2">
                    <Skeleton class="mt-0.5 size-6 shrink-0 rounded-full" />
                    <div class="flex min-w-0 flex-1 flex-col gap-2">
                        <Skeleton class="h-4 w-3/4" />
                        <Skeleton class="h-4 w-full" />
                    </div>
                    <Skeleton v-if="step === 1" class="h-8 w-12 shrink-0 sm:w-24" />
                </div>
            </CardContent>
        </Card>
    </div>
</template>
