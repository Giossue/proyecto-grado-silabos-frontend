<script setup lang="ts">
import { ChevronsUpDown } from '@lucide/vue';
import { computed, ref } from 'vue';
import WorkScopeSwitcherSheet from '@/components/domain/identity/WorkScopeSwitcherSheet.vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import UserInfo from '@/components/UserInfo.vue';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { sessionState } from '@/state/session';
import type { User } from '@/types';

const user = computed<User>(() => ({
    id: sessionState.current.value?.user.id ?? '',
    nombre: sessionState.current.value?.user.name ?? '',
    correo_electronico: sessionState.current.value?.user.email ?? '',
    avatar: undefined,
    correo_verificado_en: sessionState.current.value?.user.email_verified ? 'verificado' : null,
    debe_cambiar_contrasena: sessionState.current.value?.user.must_change_password ?? false,
}));
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const canSwitchScope = computed(() => (sessionState.current.value?.available_roles.length ?? 0) > 1);
const roleName = computed(() => {
    switch (activeRole.value?.code) {
        case 'administrador': return 'Administrador';
        case 'coordinador': return 'Coordinador';
        case 'docente': return 'Docente';
        default: return 'Sin ámbito activo';
    }
});
const switcherOpen = ref(false);
const { isMobile, state } = useSidebar();
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        data-test="sidebar-menu-button"
                    >
                        <UserInfo :user="user" :subtitle="activeRole?.career_name ?? roleName" />
                        <ChevronsUpDown class="ml-auto" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    :side="isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'"
                    align="end"
                    :side-offset="4"
                >
                    <UserMenuContent
                        :user="user"
                        :can-switch-scope="canSwitchScope"
                        @switch-scope="switcherOpen = true"
                    />
                </DropdownMenuContent>
            </DropdownMenu>
            <WorkScopeSwitcherSheet v-model:open="switcherOpen" />
        </SidebarMenuItem>
    </SidebarMenu>
</template>
