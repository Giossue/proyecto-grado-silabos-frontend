<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppUpdatePrompt from '@/components/AppUpdatePrompt.vue';
import AppLayout from '@/layouts/AppLayout.vue';
import SyllabusEditorLayout from '@/layouts/SyllabusEditorLayout.vue';
import WorkspaceLayout from '@/layouts/WorkspaceLayout.vue';
import { focusContent } from '@/lib/pageAnnouncement';
import type { BreadcrumbItem } from '@/types';

const route = useRoute();
const usesSyllabusEditorLayout = computed(() =>
    route.meta.requiresAuth === true && route.meta.layout === 'syllabus-editor',
);
const usesWorkspaceLayout = computed(() =>
    route.meta.requiresAuth === true && route.meta.layout === 'workspace',
);
const usesShell = computed(() =>
    route.meta.requiresAuth === true &&
    route.meta.shell !== false &&
    !usesSyllabusEditorLayout.value &&
    !usesWorkspaceLayout.value,
);
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const title = route.meta.title;
    return typeof title === 'string' && title !== '' ? [{ title }] : [];
});
</script>

<template>
    <a href="#contenido" class="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-menu focus:not-sr-only focus:fixed focus:top-2 focus:left-2" @click.prevent="focusContent">Saltar al contenido</a>
    <ScrollArea data-app-scroll class="h-dvh">
        <SyllabusEditorLayout v-if="usesSyllabusEditorLayout">
            <RouterView />
        </SyllabusEditorLayout>
        <WorkspaceLayout v-else-if="usesWorkspaceLayout">
            <RouterView />
        </WorkspaceLayout>
        <AppLayout v-else-if="usesShell" :breadcrumbs="breadcrumbs">
            <RouterView />
        </AppLayout>
        <RouterView v-else />
    </ScrollArea>
    <AppUpdatePrompt />
</template>
