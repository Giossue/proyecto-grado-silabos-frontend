<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
import type { BreadcrumbItem } from '@/types';

const route = useRoute();
const usesShell = computed(() => route.meta.requiresAuth === true && route.meta.shell !== false);
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const title = typeof route.meta.breadcrumbTitle === 'string'
        ? route.meta.breadcrumbTitle
        : route.meta.title;
    const href = typeof route.meta.breadcrumbHref === 'string'
        ? route.meta.breadcrumbHref
        : route.fullPath;

    return typeof title === 'string' && title !== '' ? [{ title, href }] : [];
});
</script>

<template>
    <AppLayout v-if="usesShell" :breadcrumbs="breadcrumbs">
        <RouterView />
    </AppLayout>
    <RouterView v-else />
</template>
