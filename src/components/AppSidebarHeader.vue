<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import NotificationsPopover from '@/components/NotificationsPopover.vue';
import SetupProgress from '@/components/SetupProgress.vue';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem } from '@/types';

// La cabecera ya no muestra el título de la página: solo el botón del menú y los accesos.
withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[]; pageTitle?: string }>(), {
    breadcrumbs: () => [],
    pageTitle: '',
});
</script>

<template>
    <header
        class="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-sidebar-border/70 bg-background px-6 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(3rem+env(safe-area-inset-top))] md:px-4"
    >
        <div class="flex items-center gap-2">
            <SidebarTrigger class="-ml-1" />
        </div>
        <div class="ml-auto flex items-center gap-2">
            <SetupProgress />
            <NotificationsPopover />
            <AppearanceToggle />
        </div>
    </header>
</template>
