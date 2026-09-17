<script setup lang="ts">
import { Building2, LogOut, Settings } from '@lucide/vue';
import { useRouter } from 'vue-router';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import UserInfo from '@/components/UserInfo.vue';
import { logout } from '@/api/session';
import { sessionState } from '@/state/session';
import type { User } from '@/types';

withDefaults(defineProps<{ user: User; canSwitchScope?: boolean }>(), {
    canSwitchScope: false,
});
defineEmits<{ 'switch-scope': [] }>();

const router = useRouter();
const handleLogout = async (): Promise<void> => {
    await logout();
    sessionState.clear();
    await router.replace('/ingresar');
};
</script>

<template>
    <DropdownMenuLabel class="p-0 font-normal">
        <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserInfo :user="user" :show-email="true" />
        </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
        <DropdownMenuItem v-if="canSwitchScope" @select="$emit('switch-scope')">
            <Building2 data-icon="inline-start" aria-hidden="true" />
            Cambiar carrera o rol
        </DropdownMenuItem>
        <DropdownMenuItem :as-child="true">
            <RouterLink class="block w-full cursor-pointer" to="/configuracion/perfil">
                <Settings data-icon="inline-start" aria-hidden="true" />
                Configuración
            </RouterLink>
        </DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem
        class="block w-full cursor-pointer"
        data-test="logout-button"
        @select="handleLogout"
    >
        <LogOut data-icon="inline-start" aria-hidden="true" />
        Cerrar sesión
    </DropdownMenuItem>
</template>
