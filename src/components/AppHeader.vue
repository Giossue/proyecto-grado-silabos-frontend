<script setup lang="ts">
import { BookOpen, Folder, LayoutGrid, Menu, Search } from '@lucide/vue';
import { computed } from 'vue';
import AppLogo from '@/components/AppLogo.vue';
import AppLogoIcon from '@/components/AppLogoIcon.vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { getInitials } from '@/composables/useInitials';
import { toUrl } from '@/lib/utils';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import type { BreadcrumbItem, NavItem, User } from '@/types';

const props = withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[] }>(), {
    breadcrumbs: () => [],
});

const user = computed<User>(() => ({
    id: sessionState.current.value?.user.id ?? '',
    nombre: sessionState.current.value?.user.name ?? '',
    correo_electronico: sessionState.current.value?.user.email ?? '',
    avatar: undefined,
    correo_verificado_en: sessionState.current.value?.user.email_verified ? 'verificado' : null,
}));
const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
const activeItemStyles = 'bg-accent text-accent-foreground';
const trail = computed<BreadcrumbItem[]>(() => {
    const last = props.breadcrumbs.at(-1);
    return last ? [last] : [];
});
const mainNavItems: NavItem[] = [{ title: 'Panel', href: paths.dashboard, icon: LayoutGrid }];
const rightNavItems: NavItem[] = [
    { title: 'Repositorio', href: 'https://github.com/Giossue/proyecto-grado-silabos', icon: Folder },
    { title: 'Documentación', href: 'https://laravel.com/docs', icon: BookOpen },
];
</script>

<template>
    <div>
        <div class="border-b border-sidebar-border/80">
            <div class="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                <div class="lg:hidden">
                    <Sheet>
                        <SheetTrigger as-child><Button variant="ghost" size="icon" class="mr-2 h-9 w-9"><Menu class="h-5 w-5" /><span class="sr-only">Abrir navegación</span></Button></SheetTrigger>
                        <SheetContent side="left" class="w-[300px] p-6">
                            <SheetTitle class="sr-only">Menú de navegación</SheetTitle>
                            <SheetHeader class="flex justify-start text-left"><AppLogoIcon class="size-6 fill-current text-foreground" /></SheetHeader>
                            <div class="flex h-full flex-1 flex-col justify-between gap-4 py-6">
                                <nav class="-mx-3 flex flex-col gap-1">
                                    <RouterLink v-for="item in mainNavItems" :key="item.title" :to="toUrl(item.href)" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent" :class="whenCurrentUrl(item.href, activeItemStyles)">
                                        <component :is="item.icon" v-if="item.icon" class="size-5" />{{ item.title }}
                                    </RouterLink>
                                </nav>
                                <div class="flex flex-col gap-4">
                                    <a v-for="item in rightNavItems" :key="item.title" :href="toUrl(item.href)" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-medium"><component :is="item.icon" v-if="item.icon" class="size-5" /><span>{{ item.title }}</span></a>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <RouterLink :to="paths.dashboard" class="flex items-center gap-x-2"><AppLogo /></RouterLink>
                <div class="hidden h-full lg:flex lg:flex-1">
                    <NavigationMenu class="ml-10 flex h-full items-stretch">
                        <NavigationMenuList class="flex h-full items-stretch gap-2">
                            <NavigationMenuItem v-for="item in mainNavItems" :key="item.title" class="relative flex h-full items-center">
                                <RouterLink :class="[navigationMenuTriggerStyle(), whenCurrentUrl(item.href, activeItemStyles), 'h-9 cursor-pointer gap-2 px-3']" :to="toUrl(item.href)"><component :is="item.icon" v-if="item.icon" class="size-4" />{{ item.title }}</RouterLink>
                                <div v-if="isCurrentUrl(item.href)" class="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-primary" />
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <div class="ml-auto flex items-center gap-2">
                    <div class="relative flex items-center gap-1">
                        <Button variant="ghost" size="icon" class="group h-9 w-9 cursor-pointer"><Search class="size-5 opacity-80 group-hover:opacity-100" /><span class="sr-only">Buscar</span></Button>
                        <div class="hidden gap-1 lg:flex">
                            <TooltipProvider v-for="item in rightNavItems" :key="item.title" :delay-duration="0">
                                <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" as-child class="group h-9 w-9 cursor-pointer"><a :href="toUrl(item.href)" target="_blank" rel="noopener noreferrer"><span class="sr-only">{{ item.title }}</span><component :is="item.icon" class="size-5 opacity-80 group-hover:opacity-100" /></a></Button></TooltipTrigger><TooltipContent><p>{{ item.title }}</p></TooltipContent></Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child><Button variant="ghost" size="icon" class="relative size-10 w-auto rounded-full p-1 focus-within:ring-2 focus-within:ring-primary"><Avatar class="size-8 overflow-hidden rounded-full"><AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.nombre" /><AvatarFallback class="rounded-lg bg-muted font-semibold text-muted-foreground">{{ getInitials(user.nombre) }}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="w-56"><UserMenuContent :user="user" /></DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
        <div v-if="trail.length > 0" class="flex w-full border-b border-sidebar-border/70"><div class="mx-auto flex h-12 w-full items-center justify-start px-4 text-muted-foreground md:max-w-7xl"><Breadcrumbs :breadcrumbs="trail" /></div></div>
    </div>
</template>
