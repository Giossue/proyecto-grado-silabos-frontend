<script setup lang="ts">
import { computed, provide, ref, toRef } from 'vue';
import AccessibilityDialog from '@/components/AccessibilityDialog.vue';
import AppContent from '@/components/AppContent.vue';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import InstallAppDialog from '@/components/InstallAppDialog.vue';
import WorkScopeSwitcherSheet from '@/components/domain/identity/WorkScopeSwitcherSheet.vue';
import RoleDeadlineBanner from '@/components/domain/RoleDeadlineBanner.vue';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import { Toaster } from '@/components/ui/sonner';
import { breadcrumbsKey, pageTitleKey } from '@/composables/usePageBreadcrumbs';
import { useShowsSidebar } from '@/composables/useShowsSidebar';
import { installAppOpen, scopeSwitcherOpen } from '@/state/shellDialogs';
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
const curriculumEditorOpen = curriculumEditorState.open;
const editorOpen = computed(() => templateEditorOpen.value || curriculumEditorOpen.value);

provide(pageTitleKey, pageTitle);
const showsSidebar = useShowsSidebar();
</script>

<template>
    <AppShell variant="sidebar">
        <AppSidebar v-if="!editorOpen && showsSidebar" />
        <AppContent variant="sidebar" :class="editorOpen ? 'overflow-clip' : 'overflow-clip max-sm:pb-(--mobile-nav-height)'">
            <AppSidebarHeader
                v-if="!editorOpen"
                :breadcrumbs="breadcrumbs"
                :page-title="pageTitle"
                :sidebar="showsSidebar"
            />
            <RoleDeadlineBanner v-if="!editorOpen" />
            <slot />
            <ScreenHelpButton v-if="!templateEditorOpen" :editor-mode="curriculumEditorOpen" />
            <AccessibilityDialog v-if="!editorOpen" floating />
        </AppContent>
    </AppShell>
    <WorkScopeSwitcherSheet v-model:open="scopeSwitcherOpen" />
    <InstallAppDialog v-if="!showsSidebar" v-model:open="installAppOpen" />
    <Toaster />
</template>
