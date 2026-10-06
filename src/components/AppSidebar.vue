<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLogo from '@/components/AppLogo.vue';
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
import { sessionState } from '@/state/session';
import { useMainNavItems } from '@/composables/useMainNavItems';
import { paths } from '@/lib/routes';
import type { NavItem } from '@/types';

const route = useRoute();
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
// El docente no tiene Panel: su logo no enlaza ni se ve como botón.
const logoLinksToPanel = computed(() => ['administrador', 'coordinador', 'bibliotecario'].includes(activeRole.value?.code ?? ''));
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
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton v-if="logoLinksToPanel" size="lg" as-child>
                        <RouterLink :to="paths.dashboard" aria-label="Ir al inicio"><AppLogo /></RouterLink>
                    </SidebarMenuButton>
                    <div v-else class="flex h-12 items-center gap-2 p-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
                        <AppLogo />
                    </div>
                </SidebarMenuItem>
            </SidebarMenu>
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
