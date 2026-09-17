<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
import type { BreadcrumbItem } from '@/types';

const route = useRoute();
const usesShell = computed(() => route.meta.requiresAuth === true && route.meta.shell !== false);
const breadcrumbs = computed<BreadcrumbItem[]>(() =>
    typeof route.meta.title === 'string' && route.meta.title !== ''
        ? [{ title: route.meta.title }]
        : [],
);
</script>

<template>
    <AppLayout v-if="usesShell" :breadcrumbs="breadcrumbs">
        <RouterView />
    </AppLayout>
    <RouterView v-else />
</template>
