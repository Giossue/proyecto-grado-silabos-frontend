<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
import SyllabusEditorLayout from '@/layouts/SyllabusEditorLayout.vue';
import type { BreadcrumbItem } from '@/types';

const route = useRoute();
const usesSyllabusEditorLayout = computed(() =>
    route.meta.requiresAuth === true && route.meta.layout === 'syllabus-editor',
);
const usesShell = computed(() =>
    route.meta.requiresAuth === true &&
    route.meta.shell !== false &&
    !usesSyllabusEditorLayout.value,
);
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const title = route.meta.title;
    return typeof title === 'string' && title !== '' ? [{ title }] : [];
});
</script>

<template>
    <SyllabusEditorLayout v-if="usesSyllabusEditorLayout">
        <RouterView />
    </SyllabusEditorLayout>
    <AppLayout v-else-if="usesShell" :breadcrumbs="breadcrumbs">
        <RouterView />
    </AppLayout>
    <RouterView v-else />
</template>
