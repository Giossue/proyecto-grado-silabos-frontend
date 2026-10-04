<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import NavUser from '@/components/NavUser.vue';
import NotificationsPopover from '@/components/NotificationsPopover.vue';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useActiveNavTitle } from '@/composables/useMainNavItems';
import type { BreadcrumbItem } from '@/types';

withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[]; pageTitle?: string }>(), {
    breadcrumbs: () => [],
    pageTitle: '',
});

const navTitle = useActiveNavTitle();
</script>

<template>
    <header
        class="sticky top-0 z-30 flex h-(--app-header-height) shrink-0 items-center gap-2 border-b border-sidebar-border/70 bg-background px-4 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--app-header-compact-height)"
    >
        <div class="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger class="-ml-1" />
            <h1 v-if="navTitle" class="truncate text-base font-semibold">{{ navTitle }}</h1>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsPopover />
            <AppearanceToggle />
            <NavUser />
        </div>
    </header>
</template>
