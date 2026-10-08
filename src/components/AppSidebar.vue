<script setup lang="ts">
import { Building2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLogo from '@/components/AppLogo.vue';
import WorkScopeSwitcherSheet from '@/components/domain/identity/WorkScopeSwitcherSheet.vue';
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
import { sessionState } from '@/state/session';
import type { NavItem } from '@/types';

const route = useRoute();
const mainNavItems = useMainNavItems();
const footerNavItems: NavItem[] = [];
const { isMobile, setOpenMobile } = useSidebar();
const canSwitchScope = computed(() => (sessionState.current.value?.available_roles.length ?? 0) > 1);
const switcherOpen = ref(false);

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
            <SidebarMenu v-if="canSwitchScope">
                <SidebarMenuItem>
                    <SidebarMenuButton data-test="switch-scope" tooltip="Cambiar carrera o rol" @click="switcherOpen = true">
                        <Building2 aria-hidden="true" />
                        <span>Cambiar carrera o rol</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
    <WorkScopeSwitcherSheet v-model:open="switcherOpen" />
    <slot />
</template>
