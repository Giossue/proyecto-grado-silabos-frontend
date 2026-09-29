<script setup lang="ts">
import { computed, provide, ref, toRef } from 'vue';
import AppContent from '@/components/AppContent.vue';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import { Toaster } from '@/components/ui/sonner';
import { breadcrumbsKey, pageTitleKey } from '@/composables/usePageBreadcrumbs';
import { templateEditorState } from '@/state/templateEditor';
import { curriculumEditorState } from '@/state/curriculumEditor';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const props = withDefaults(defineProps<Props>(), {
    breadcrumbs: () => [],
});

provide(breadcrumbsKey, toRef(props, 'breadcrumbs'));

const pageTitle = ref('');
const templateEditorOpen = templateEditorState.open;
const editorOpen = computed(() => templateEditorOpen.value || curriculumEditorState.open.value);

provide(pageTitleKey, pageTitle);
</script>

<template>
    <AppShell variant="sidebar">
        <AppSidebar v-if="!editorOpen" />
        <AppContent variant="sidebar" class="overflow-clip">
            <AppSidebarHeader
                v-if="!editorOpen"
                :breadcrumbs="breadcrumbs"
                :page-title="pageTitle"
            />
            <slot />
        </AppContent>
    </AppShell>
    <Toaster />
</template>
