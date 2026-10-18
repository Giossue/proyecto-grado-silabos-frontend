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
        class="sticky top-0 z-30 flex h-(--app-header-height) shrink-0 items-center gap-2 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--app-header-compact-height) max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:h-(--mobile-nav-height) max-sm:justify-around max-sm:border-t max-sm:border-b-0 max-sm:pt-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:shadow-menu"
    >
        <div class="flex min-w-0 flex-1 items-center gap-2 max-sm:contents">
            <SidebarTrigger class="-ml-1" />
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-1 max-sm:contents sm:gap-2">
            <NotificationsSheet />
            <AppearanceToggle />
            <div class="max-sm:contents sm:hidden"><AccessibilityDialog /></div>
            <NavUser />
        </div>
    </header>
</template>
