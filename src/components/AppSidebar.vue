<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLogo from '@/components/AppLogo.vue';
import NavFooter from '@/components/NavFooter.vue';
import NavMain from '@/components/NavMain.vue';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    useSidebar,
} from '@/components/ui/sidebar';
import { useMainNavItems } from '@/composables/useMainNavItems';
import type { NavItem } from '@/types';

const route = useRoute();
const mainNavItems = useMainNavItems();
const footerNavItems: NavItem[] = [];
const { isMobile, setOpenMobile } = useSidebar();

watch(() => route.fullPath, () => {
    if (isMobile.value) setOpenMobile(false);
});
</script>

<template>
    <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
            <div
                class="flex h-12 items-center p-2 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:p-0"
            >
                <AppLogo />
            </div>
        </SidebarHeader>
        <SidebarContent>
            <NavMain :items="mainNavItems" />
        </SidebarContent>
        <SidebarFooter>
            <NavFooter :items="footerNavItems" />
        </SidebarFooter>
    </Sidebar>
    <slot />
</template>
