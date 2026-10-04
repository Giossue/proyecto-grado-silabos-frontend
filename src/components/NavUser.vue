<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { computed, ref } from 'vue';
import WorkScopeSwitcherSheet from '@/components/domain/identity/WorkScopeSwitcherSheet.vue';
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

const user = computed<User>(() => ({
    id: sessionState.current.value?.user.id ?? '',
    nombre: sessionState.current.value?.user.name ?? '',
    correo_electronico: sessionState.current.value?.user.email ?? '',
    avatar: undefined,
    correo_verificado_en: sessionState.current.value?.user.email_verified ? 'verificado' : null,
}));
const canSwitchScope = computed(() => (sessionState.current.value?.available_roles.length ?? 0) > 1);
const switcherOpen = ref(false);
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                type="button"
                variant="ghost"
                class="h-11 rounded-lg px-2 sm:w-48 lg:w-56"
                aria-label="Menú de usuario"
            >
                <div class="flex min-w-0 flex-1 items-center gap-2 [&>.grid]:hidden [&>.grid]:min-w-0 sm:[&>.grid]:grid">
                    <UserInfo :user="user" />
                    <ChevronDown class="hidden sm:block" data-icon="inline-end" aria-hidden="true" />
                </div>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
            class="w-72 max-w-(--reka-dropdown-menu-content-available-width) rounded-lg"
            side="bottom"
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
</template>
