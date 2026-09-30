<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import AppLogo from '@/components/AppLogo.vue';
import NotificationsPopover from '@/components/NotificationsPopover.vue';
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
                <AppLogo />
            </div>
            <p
                v-if="pageTitle"
                class="hidden min-w-0 truncate text-sm text-muted-foreground sm:block"
            >
                {{ pageTitle }}
            </p>
            <div class="ml-auto flex items-center gap-2">
                <NotificationsPopover />
                <AppearanceToggle />
                <DropdownMenu>
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
                </DropdownMenu>
            </div>
        </header>
        <main class="flex flex-1 flex-col p-4 md:p-6">
            <slot />
        </main>
    </div>
    <Toaster />
</template>
