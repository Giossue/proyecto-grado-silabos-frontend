<script setup lang="ts">
import { Menu } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import logo from '@/assets/logo-ueb-horizontal.webp';
import logoLight from '@/assets/logo-ueb-horizontal-claro.webp';
import AccessibilityDialog from '@/components/AccessibilityDialog.vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import NavUser from '@/components/NavUser.vue';
import NotificationsSheet from '@/components/NotificationsSheet.vue';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useMainNavItems } from '@/composables/useMainNavItems';
import { toUrl } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const { toggleSidebar } = useSidebar();

withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[]; pageTitle?: string; sidebar?: boolean }>(), {
    breadcrumbs: () => [],
    pageTitle: '',
    sidebar: true,
});

const navItems = useMainNavItems();
const homeHref = computed(() => toUrl(navItems.value[0]?.href ?? '/panel'));
</script>

<template>
    <header
        class="sticky top-0 z-30 flex h-(--app-header-height) shrink-0 items-center gap-2 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--app-header-compact-height) max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:h-(--mobile-nav-height) max-sm:justify-around max-sm:border-t max-sm:border-b-0 max-sm:pt-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:shadow-menu"
    >
        <div class="flex min-w-0 flex-1 items-center gap-2 max-sm:contents">
            <RouterLink v-if="!sidebar" :to="homeHref" class="flex items-center max-sm:hidden" aria-label="Ir al inicio">
                <img :src="logoLight" width="600" height="164" decoding="async" alt="Universidad Estatal de Bolívar" class="h-12 w-auto dark:hidden" />
                <img :src="logo" width="600" height="164" decoding="async" alt="" aria-hidden="true" class="hidden h-12 w-auto dark:block" />
            </RouterLink>
            <SidebarTrigger v-if="sidebar" class="-ml-1 max-sm:hidden" />
            <Button v-if="sidebar" type="button" variant="ghost" class="h-12 min-w-16 flex-col gap-0.5 px-3 order-3 sm:hidden" aria-label="Abrir el menú" @click="toggleSidebar">
                <Menu class="size-5" aria-hidden="true" />
                <span class="text-xs font-medium" aria-hidden="true">Menú</span>
            </Button>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-1 max-sm:contents sm:gap-2">
            <NotificationsSheet />
            <div class="max-sm:hidden"><AppearanceToggle /></div>
            <AccessibilityDialog remote />
            <NavUser />
        </div>
    </header>
</template>
