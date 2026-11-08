<script setup lang="ts">
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import { computed, provide, ref } from 'vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import logo from '@/assets/logo-ueb-horizontal.webp';
import logoLight from '@/assets/logo-ueb-horizontal-claro.webp';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog.vue';
import NotificationsSheet from '@/components/NotificationsSheet.vue';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';
import { getInitials } from '@/composables/useInitials';
import { pageTitleKey } from '@/composables/usePageBreadcrumbs';
import { sessionState } from '@/state/session';
import type { User } from '@/types';

const pageTitle = ref('');
provide(pageTitleKey, pageTitle);

const user = computed<User>(() => ({
    id: sessionState.current.value?.user.id ?? '',
    nombre: sessionState.current.value?.user.name ?? '',
    correo_electronico: sessionState.current.value?.user.email ?? '',
    avatar: undefined,
    correo_verificado_en: sessionState.current.value?.user.email_verified
        ? 'verificado'
        : null,
}));
</script>

<template>
    <div class="flex min-h-svh w-full flex-col bg-background">
        <header
            class="sticky top-0 z-30 flex h-(--app-header-height) shrink-0 items-center gap-3 border-b border-sidebar-border/70 bg-background px-4 pt-[env(safe-area-inset-top)] md:px-6"
        >
            <div class="flex items-center gap-2">
                <img :src="logoLight" width="600" height="164" decoding="async" alt="Universidad Estatal de Bolívar" class="h-12 w-auto dark:hidden" />
                <img :src="logo" width="600" height="164" decoding="async" alt="" aria-hidden="true" class="hidden h-12 w-auto dark:block" />
            </div>
            <div class="ml-auto flex items-center gap-2">
                <NotificationsSheet />
                <AppearanceToggle />
                <MenuTooltip label="Menú de usuario"><DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="rounded-full"
                            aria-label="Menú de usuario"
                        >
                            <Avatar class="size-8">
                                <AvatarFallback class="bg-muted text-xs font-semibold text-muted-foreground">
                                    {{ getInitials(user.nombre) }}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-64">
                        <UserMenuContent :user="user" />
                    </DropdownMenuContent>
                </DropdownMenu></MenuTooltip>
            </div>
        </header>
        <main id="contenido" tabindex="-1" class="flex flex-1 flex-col p-4 outline-hidden md:p-6">
            <slot />
        </main>
    </div>
    <LogoutConfirmDialog />
    <Toaster />
</template>
