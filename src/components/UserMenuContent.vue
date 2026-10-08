<script setup lang="ts">
import { LogOut, Settings } from '@lucide/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import UserInfo from '@/components/UserInfo.vue';
import { logout } from '@/api/session';
import { sessionState } from '@/state/session';
import type { User } from '@/types';
import { clearIntendedRoute } from '@/lib/intended-route';
import { paths, roleSetting } from '@/lib/routes';

defineProps<{ user: User }>();

const router = useRouter();
const settingsHref = computed(() => {
    const code = sessionState.current.value?.active_role?.code;
    return code ? roleSetting(code, 'profile') : null;
});
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
