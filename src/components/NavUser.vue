<script setup lang="ts">
import { ChevronDown, CircleUser } from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserInfo from '@/components/UserInfo.vue';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { sessionState } from '@/state/session';
import type { User } from '@/types';

// En móvil la barra está abajo: el menú se abre hacia arriba.
const compact = useMediaQuery('(width < 40rem)');
const user = computed<User>(() => ({
    id: sessionState.current.value?.user.id ?? '',
    nombre: sessionState.current.value?.user.name ?? '',
    correo_electronico: sessionState.current.value?.user.email ?? '',
    avatar: undefined,
    correo_verificado_en: sessionState.current.value?.user.email_verified ? 'verificado' : null,
}));
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                type="button"
                variant="ghost"
                class="h-11 rounded-lg px-2 max-sm:h-12 max-sm:min-w-16 max-sm:flex-col max-sm:gap-0.5 max-sm:order-2"
                aria-label="Menú de usuario"
            >
                <CircleUser class="sm:hidden size-5" aria-hidden="true" />
                <span class="text-xs font-medium sm:hidden" aria-hidden="true">Perfil</span>
                <div class="flex min-w-0 flex-1 items-center gap-2 max-sm:hidden">
                    <UserInfo :user="user" :show-full-name="true" />
                    <ChevronDown class="hidden sm:block" data-icon="inline-end" aria-hidden="true" />
                </div>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
            class="w-72 max-w-(--reka-dropdown-menu-content-available-width) rounded-lg"
            :side="compact ? 'top' : 'bottom'"
            align="end"
            :side-offset="4"
        >
            <UserMenuContent :user="user" />
        </DropdownMenuContent>
    </DropdownMenu>
</template>
