<script setup lang="ts">
import { Building2, Download, LogOut, Moon, PersonStanding, Settings, Sun } from '@lucide/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import UserInfo from '@/components/UserInfo.vue';
import { leaveActiveRole, logout } from '@/api/session';
import { useAppearance } from '@/composables/useAppearance';
import { useShowsSidebar } from '@/composables/useShowsSidebar';
import { installAppState } from '@/state/installApp';
import { installAppOpen } from '@/state/shellDialogs';
import { accessibilityDialogOpen } from '@/state/accessibilityDialog';
import { sessionState } from '@/state/session';
import type { User } from '@/types';
import { clearIntendedRoute } from '@/lib/intended-route';
import { paths, roleSetting } from '@/lib/routes';

defineProps<{ user: User }>();

const router = useRouter();
const { appearance, updateAppearance } = useAppearance();
const dark = computed(() => appearance.value === 'dark');
const showsSidebar = useShowsSidebar();
const canSwitchScope = computed(() => sessionState.current.value?.active_role != null && (sessionState.current.value?.available_roles.length ?? 0) > 1);
const { installed } = installAppState;
const settingsHref = computed(() => {
    const code = sessionState.current.value?.active_role?.code;
    return code ? roleSetting(code, 'profile') : null;
});
const switchScope = async (): Promise<void> => {
    sessionState.replace(await leaveActiveRole());
    await router.push(paths.roleSelection);
};
const handleLogout = async (): Promise<void> => {
    await logout();
    sessionState.clear();
    clearIntendedRoute();
    await router.replace(paths.login);
};
</script>

<template>
    <DropdownMenuLabel class="p-0 font-normal">
        <div class="flex min-w-0 items-start gap-2 px-1 py-1.5 text-left text-sm">
            <UserInfo :user="user" :show-email="true" :show-full-name="true" />
        </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem v-if="settingsHref" as-child>
        <RouterLink :to="settingsHref" class="w-full">
            <Settings data-icon="inline-start" aria-hidden="true" />
            Configuración
        </RouterLink>
    </DropdownMenuItem>
    <DropdownMenuItem v-if="canSwitchScope" data-test="switch-scope" @select="switchScope">
        <Building2 data-icon="inline-start" aria-hidden="true" />
        Cambiar carrera o rol
    </DropdownMenuItem>
    <DropdownMenuItem v-if="!showsSidebar && !installed" class="sm:hidden" data-test="install-app" @select="installAppOpen = true">
        <Download data-icon="inline-start" aria-hidden="true" />
        Instalar aplicación
    </DropdownMenuItem>
    <DropdownMenuItem class="sm:hidden" @select="updateAppearance(dark ? 'light' : 'dark')">
        <Sun v-if="dark" data-icon="inline-start" aria-hidden="true" />
        <Moon v-else data-icon="inline-start" aria-hidden="true" />
        {{ dark ? 'Tema claro' : 'Tema oscuro' }}
    </DropdownMenuItem>
    <DropdownMenuItem class="sm:hidden" @select="accessibilityDialogOpen = true">
        <PersonStanding data-icon="inline-start" aria-hidden="true" />
        Accesibilidad
    </DropdownMenuItem>
    <DropdownMenuSeparator v-if="settingsHref" />
    <DropdownMenuItem
        variant="destructive"
        class="w-full"
        data-test="logout-button"
        @select="handleLogout"
    >
        <LogOut data-icon="inline-start" aria-hidden="true" />
        Cerrar sesión
    </DropdownMenuItem>
</template>
