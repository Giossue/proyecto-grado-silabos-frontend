<script setup lang="ts">
import AccessibilityDialog from '@/components/AccessibilityDialog.vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import NavUser from '@/components/NavUser.vue';
import NotificationsSheet from '@/components/NotificationsSheet.vue';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem } from '@/types';

withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[]; pageTitle?: string }>(), {
    breadcrumbs: () => [],
    pageTitle: '',
});
</script>

<template>
    <header
        class="sticky top-0 z-30 flex h-(--app-header-height) shrink-0 items-center gap-2 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--app-header-compact-height)"
    >
        <div class="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger class="-ml-1" />
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsSheet />
            <AppearanceToggle />
            <div class="sm:hidden"><AccessibilityDialog /></div>
            <NavUser />
        </div>
    </header>
</template>
