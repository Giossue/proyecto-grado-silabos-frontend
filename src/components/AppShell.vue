<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Bell, BookOpenCheck, Building2, CalendarRange, ChartNoAxesCombined, ClipboardCheck, FileStack, LayoutGrid, LibraryBig, LogOut, Network, ScrollText, Settings, UsersRound } from '@lucide/vue';
import { getNotifications } from '@/api/notifications';
import { logout } from '@/api/session';
import { sessionState } from '@/state/session';
import { pageTitleKey, saysTheSame } from '@/composables/usePageTitle';
import AppLogo from '@/components/AppLogo.vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import WorkScopeSwitcherSheet from '@/components/domain/identity/WorkScopeSwitcherSheet.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
type NavigationItem = { label: string; to: string; icon: unknown };
const route = useRoute();
const router = useRouter();
const unreadCount = ref(0);
const pending = ref(false);
const scopeSwitcherOpen = ref(false);
const contentPageTitle = ref('');
provide(pageTitleKey, contentPageTitle);
const navigation = computed<NavigationItem[]>(() => {
  const common = [{ label: 'Panel', to: '/panel', icon: LayoutGrid }];
  switch (sessionState.current.value?.active_role?.code) {
    case 'administrador': return [...common,
      { label: 'Convocatorias', to: '/administracion/procesos', icon: CalendarRange },
      { label: 'Usuarios y roles', to: '/administracion/usuarios', icon: UsersRound },
      { label: 'Estructura académica', to: '/administracion/estructura-academica', icon: Building2 },
      { label: 'Plantilla', to: '/administracion/plantilla', icon: FileStack },
      { label: 'Auditoría', to: '/administracion/auditoria', icon: ScrollText }];
    case 'coordinador': return [...common,
      { label: 'Convocatorias', to: '/coordinacion/convocatorias', icon: CalendarRange },
      { label: 'Revisión', to: '/coordinacion/revisiones', icon: ClipboardCheck },
      { label: 'Asignación docente', to: '/coordinacion/asignaciones-docentes', icon: UsersRound },
      { label: 'Materias y paralelos', to: '/coordinacion/materias-paralelos', icon: BookOpenCheck },
      { label: 'Malla', to: '/coordinacion/malla', icon: Network },
      { label: 'Fuentes académicas', to: '/coordinacion/fuentes', icon: LibraryBig },
      { label: 'Configuración IA', to: '/coordinacion/configuracion-ia', icon: BookOpenCheck },
      { label: 'Informes', to: '/coordinacion/informes', icon: ChartNoAxesCombined }];
    case 'docente': return [...common, { label: 'Mis sílabos', to: '/mis-silabos', icon: BookOpenCheck }];
    default: return common;
  }
});
const initials = computed(() => (sessionState.current.value?.user.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''));
const activeLabel = computed(() => sessionState.current.value?.active_role?.career_name ?? sessionState.current.value?.active_role?.code ?? 'Sin ámbito');
const pageTitle = computed(() => {
  const fallback = typeof route.meta.title === 'string'
    ? route.meta.title
    : navigation.value.find((item) => route.path.startsWith(item.to))?.label ?? 'Sílabos UEB';
  if (!contentPageTitle.value || saysTheSame(fallback, contentPageTitle.value)) return fallback;
  return contentPageTitle.value;
});
const isActive = (path: string): boolean => route.path === path || (path !== '/panel' && route.path.startsWith(`${path}/`));
const closeSession = async (): Promise<void> => { pending.value = true; try { await logout(); sessionState.clear(); await router.replace('/ingresar'); } finally { pending.value = false; } };
onMounted(async () => { try { unreadCount.value = (await getNotifications('unread')).unread_count; } catch { unreadCount.value = 0; } });
</script>
<template>
  <SidebarProvider>
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" as-child><RouterLink to="/panel"><AppLogo /></RouterLink></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
      <nav class="contents" aria-label="Navegación principal"><SidebarContent><SidebarGroup class="px-2 py-0"><SidebarGroupLabel>Trabajo</SidebarGroupLabel><SidebarMenu>
        <SidebarMenuItem v-for="item in navigation" :key="item.to"><SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.label"><RouterLink :to="item.to"><component :is="item.icon" /><span>{{ item.label }}</span></RouterLink></SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu></SidebarGroup></SidebarContent></nav>
      <SidebarFooter><SidebarMenu><SidebarMenuItem><DropdownMenu><DropdownMenuTrigger as-child><SidebarMenuButton size="lg" class="data-[state=open]:bg-sidebar-accent">
        <Avatar class="size-8 rounded-lg"><AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback></Avatar>
        <div class="grid flex-1 text-left text-sm leading-tight"><span class="truncate font-medium">{{ sessionState.current.value?.user.name }}</span><span class="truncate text-xs text-muted-foreground">{{ activeLabel }}</span></div>
      </SidebarMenuButton></DropdownMenuTrigger><DropdownMenuContent side="right" align="end" class="w-64">
        <DropdownMenuLabel>{{ sessionState.current.value?.user.email }}</DropdownMenuLabel><DropdownMenuSeparator />
        <DropdownMenuGroup v-if="(sessionState.current.value?.available_roles.length ?? 0) > 1"><DropdownMenuItem @select="scopeSwitcherOpen = true"><Building2 />Cambiar carrera o rol</DropdownMenuItem></DropdownMenuGroup>
        <DropdownMenuSeparator v-if="(sessionState.current.value?.available_roles.length ?? 0) > 1" />
        <DropdownMenuItem as-child><RouterLink to="/configuracion/perfil"><Settings /> Configuración</RouterLink></DropdownMenuItem><DropdownMenuItem :disabled="pending" @select="closeSession"><LogOut /> Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu><WorkScopeSwitcherSheet v-model:open="scopeSwitcherOpen" /></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset class="overflow-clip">
      <header class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/70 bg-background px-6 md:px-4">
        <SidebarTrigger class="-ml-1" /><h1 class="text-sm font-normal text-foreground">{{ pageTitle }}</h1>
        <div class="ml-auto flex items-center gap-2"><Tooltip><TooltipTrigger as-child><Button as-child :variant="route.path === '/notificaciones' ? 'secondary' : 'ghost'" size="icon-sm" class="relative" aria-label="Notificaciones"><RouterLink to="/notificaciones"><Bell aria-hidden="true" /><Badge v-if="unreadCount > 0" as="span" class="absolute -top-1 -right-1 min-w-5 px-1" aria-hidden="true">{{ unreadCount > 99 ? '99+' : unreadCount }}</Badge></RouterLink></Button></TooltipTrigger><TooltipContent>Notificaciones</TooltipContent></Tooltip><AppearanceToggle /></div>
      </header><slot />
    </SidebarInset><Toaster />
  </SidebarProvider>
</template>
