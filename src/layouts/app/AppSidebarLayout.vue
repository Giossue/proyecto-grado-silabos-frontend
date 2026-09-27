<script setup lang="ts">
import { provide, ref, toRef } from 'vue';
import AppContent from '@/components/AppContent.vue';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import { Toaster } from '@/components/ui/sonner';
import { breadcrumbsKey, pageTitleKey } from '@/composables/usePageBreadcrumbs';
import { templateEditorState } from '@/state/templateEditor';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const props = withDefaults(defineProps<Props>(), {
    breadcrumbs: () => [],
});

provide(breadcrumbsKey, toRef(props, 'breadcrumbs'));

/*
 * El nombre de la pantalla lo escribe el contenido y lo dibuja el encabezado. Viaja por
 * aquí para que ninguna de las veintisiete pantallas tenga que declararlo dos veces.
 */
const pageTitle = ref('');
const templateEditorOpen = templateEditorState.open;

provide(pageTitleKey, pageTitle);
</script>

<template>
    <AppShell variant="sidebar">
        <AppSidebar v-if="!templateEditorOpen" />
        <AppContent variant="sidebar" class="overflow-clip">
            <AppSidebarHeader
                v-if="!templateEditorOpen"
                :breadcrumbs="breadcrumbs"
                :page-title="pageTitle"
            />
            <slot />
        </AppContent>
    </AppShell>
    <Toaster />
</template>
