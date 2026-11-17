<script setup lang="ts">
import { computed, provide, ref, toRef } from 'vue';
import AccessibilityDialog from '@/components/AccessibilityDialog.vue';
import AppContent from '@/components/AppContent.vue';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import InstallAppDialog from '@/components/InstallAppDialog.vue';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog.vue';
import RoleDeadlineBanner from '@/components/domain/RoleDeadlineBanner.vue';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import SetupNextStepBanner from '@/components/domain/SetupNextStepBanner.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { breadcrumbsKey, pageTitleKey } from '@/composables/usePageBreadcrumbs';
import { useShowsSidebar } from '@/composables/useShowsSidebar';
import { installAppOpen } from '@/state/shellDialogs';
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
const showsSidebar = useShowsSidebar();
const templateEditorOpen = templateEditorState.open;
const curriculumEditorOpen = curriculumEditorState.open;
// El editor de plantillas ocupa toda la pantalla; el de malla solo esconde el menú lateral.
const editorOpen = templateEditorOpen;
const sidebarVisible = computed(() => showsSidebar.value && !curriculumEditorOpen.value);

provide(pageTitleKey, pageTitle);
</script>

<template>
    <!-- En móvil la página hace scroll en el documento: así funciona el gesto del navegador de deslizar para actualizar -->
    <AppShell variant="sidebar" class="h-dvh min-h-0 max-sm:h-auto max-sm:min-h-dvh">
        <AppSidebar v-if="!editorOpen && sidebarVisible" />
        <AppContent variant="sidebar" :class="editorOpen ? 'min-h-0 overflow-clip' : 'min-h-0 overflow-clip max-sm:overflow-visible max-sm:pb-(--mobile-nav-height)'">
            <AppSidebarHeader
                v-if="!editorOpen"
                :breadcrumbs="breadcrumbs"
                :page-title="pageTitle"
                :sidebar="sidebarVisible"
            />
            <!-- Los avisos quedan fuera del área que se desplaza: siempre se ven arriba. En móvil, donde hace scroll el documento, se pegan al borde superior -->
            <div v-if="!editorOpen" class="sticky top-0 z-20 shrink-0">
                <SetupNextStepBanner />
                <RoleDeadlineBanner />
            </div>
            <!-- El desplazamiento empieza bajo el encabezado y los avisos -->
            <ScrollArea data-app-scroll class="min-h-0 flex-1">
                <slot />
            </ScrollArea>
            <ScreenHelpButton :editor-mode="editorOpen" :corner="templateEditorOpen ? 'left' : 'right'" />
            <SetupChecklist v-if="!editorOpen" />
            <AccessibilityDialog v-if="!editorOpen" floating />
        </AppContent>
    </AppShell>
    <InstallAppDialog v-if="!showsSidebar" v-model:open="installAppOpen" />
    <LogoutConfirmDialog />
    <Toaster />
</template>
