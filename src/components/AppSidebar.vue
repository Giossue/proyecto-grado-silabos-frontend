<script setup lang="ts">
import { Download } from '@lucide/vue';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import logoIcon from '@/assets/logo-ueb-sidebar.png';
import logo from '@/assets/logo-ueb-horizontal.webp';
import InstallAppDialog from '@/components/InstallAppDialog.vue';
import NavFooter from '@/components/NavFooter.vue';
import NavMain from '@/components/NavMain.vue';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useMainNavItems } from '@/composables/useMainNavItems';
import { installAppState } from '@/state/installApp';
import type { NavItem } from '@/types';

const route = useRoute();
const mainNavItems = useMainNavItems();
const footerNavItems: NavItem[] = [];
const { isMobile, setOpenMobile } = useSidebar();
const installOpen = ref(false);
const { installed } = installAppState;

watch(() => route.fullPath, () => {
    if (isMobile.value) setOpenMobile(false);
});
</script>

<template>
    <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
            <div
                class="flex min-h-16 items-center p-2 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:min-h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            >
                <img :src="logo" width="600" height="164" decoding="async" alt="Universidad Estatal de Bolívar" class="h-auto w-full group-data-[collapsible=icon]:hidden" />
                <img :src="logoIcon" width="36" height="37" decoding="async" alt="Universidad Estatal de Bolívar" class="hidden size-7 object-contain group-data-[collapsible=icon]:block" />
            </div>
        </SidebarHeader>
        <SidebarContent>
            <NavMain :items="mainNavItems" />
        </SidebarContent>
        <SidebarFooter>
            <NavFooter :items="footerNavItems" />
            <SidebarMenu v-if="isMobile && !installed">
                <SidebarMenuItem>
                    <SidebarMenuButton data-test="install-app" tooltip="Instalar aplicación" @click="installOpen = true">
                        <Download aria-hidden="true" />
                        <span>Instalar aplicación</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
    <InstallAppDialog v-model:open="installOpen" />
    <slot />
</template>
