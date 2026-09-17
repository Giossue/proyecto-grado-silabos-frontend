<script setup lang="ts">
import {
    BookOpenCheck,
    Building2,
    CalendarRange,
    ChartNoAxesCombined,
    ClipboardCheck,
    FileStack,
    LayoutGrid,
    LibraryBig,
    ScrollText,
    UsersRound,
} from '@lucide/vue';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLogo from '@/components/AppLogo.vue';
import NavFooter from '@/components/NavFooter.vue';
import NavMain from '@/components/NavMain.vue';
import NavUser from '@/components/NavUser.vue';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { sessionState } from '@/state/session';
import type { NavItem } from '@/types';

const route = useRoute();
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const mainNavItems = computed<NavItem[]>(() => [
    { title: 'Panel', href: '/panel', icon: LayoutGrid },
    ...(activeRole.value?.code === 'administrador'
        ? [
              { title: 'Convocatorias', href: '/admin/convocatorias', icon: CalendarRange },
              { title: 'Usuarios y roles', href: '/admin/usuarios', icon: UsersRound },
              {
                  title: 'Estructura académica',
                  href: '/admin/estructura-academica',
                  icon: Building2,
                  items: [
                      { title: 'Facultades', href: '/admin/estructura-academica?seccion=facultad' },
                      { title: 'Campus', href: '/admin/estructura-academica?seccion=campus' },
                      { title: 'Carreras', href: '/admin/estructura-academica?seccion=carrera' },
                      { title: 'Periodos académicos', href: '/admin/estructura-academica?seccion=periodo' },
                  ],
              },
              { title: 'Plantilla', href: '/admin/plantilla', icon: FileStack },
              {
                  title: 'Auditoría',
                  href: '/admin/auditoria',
                  icon: ScrollText,
                  isActive: route.path === '/admin/procesos',
              },
          ]
        : []),
    ...(activeRole.value?.code === 'coordinador'
        ? [
              { title: 'Convocatorias', href: '/coordinacion/convocatorias', icon: CalendarRange },
              { title: 'Revisión', href: '/coordinacion/revisiones', icon: ClipboardCheck },
              { title: 'Asignación docente', href: '/coordinacion/asignaciones-docentes', icon: UsersRound },
              { title: 'Materias y paralelos', href: '/coordinacion/materias-paralelos', icon: Building2 },
              { title: 'Malla', href: '/coordinacion/malla', icon: BookOpenCheck },
              { title: 'Fuentes académicas', href: '/coordinacion/fuentes', icon: LibraryBig },
              { title: 'Informes', href: '/coordinacion/informes', icon: ChartNoAxesCombined },
          ]
        : []),
    ...(activeRole.value?.code === 'docente'
        ? [{ title: 'Mis sílabos', href: '/docente/mis-silabos', icon: BookOpenCheck }]
        : []),
]);
const footerNavItems: NavItem[] = [];
const { isMobile, setOpenMobile } = useSidebar();

watch(() => route.fullPath, () => {
    if (isMobile.value) setOpenMobile(false);
});
</script>

<template>
    <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" as-child>
                        <RouterLink to="/panel"><AppLogo /></RouterLink>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
            <NavMain :items="mainNavItems" />
        </SidebarContent>
        <SidebarFooter>
            <NavFooter :items="footerNavItems" />
            <NavUser />
        </SidebarFooter>
    </Sidebar>
    <slot />
</template>
