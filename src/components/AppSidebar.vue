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
    Settings,
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
import { paths, roleSetting } from '@/lib/routes';
import type { NavItem } from '@/types';

const route = useRoute();
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const mainNavItems = computed<NavItem[]>(() => [
    { title: 'Panel', href: paths.dashboard, icon: LayoutGrid },
    ...(activeRole.value?.code === 'administrador'
        ? [
              { title: 'Convocatorias', href: paths.admin.convocations, icon: CalendarRange },
              { title: 'Usuarios y roles', href: paths.admin.users, icon: UsersRound },
              {
                  title: 'Estructura académica',
                  href: paths.admin.academic,
                  icon: Building2,
                  items: [
                      { title: 'Facultades', href: paths.admin.academicWithSection('facultad') },
                      { title: 'Campus', href: paths.admin.academicWithSection('campus') },
                      { title: 'Carreras', href: paths.admin.academicWithSection('carrera') },
                      { title: 'Periodos académicos', href: paths.admin.academicWithSection('periodo') },
                  ],
              },
              { title: 'Plantilla', href: paths.admin.template, icon: FileStack },
              {
                  title: 'Auditoría',
                  href: paths.admin.audit,
                  icon: ScrollText,
                  isActive: route.path === paths.admin.processes,
              },
          ]
        : []),
    ...(activeRole.value?.code === 'coordinador'
        ? [
              { title: 'Convocatorias', href: paths.coordination.convocations, icon: CalendarRange },
              { title: 'Revisión', href: paths.coordination.reviews, icon: ClipboardCheck },
              { title: 'Asignación docente', href: paths.coordination.teacherAssignments, icon: UsersRound },
              { title: 'Materias y paralelos', href: paths.coordination.scheduledSubjects, icon: Building2 },
              { title: 'Malla', href: paths.coordination.curriculum, icon: BookOpenCheck },
              { title: 'Fuentes académicas', href: paths.coordination.sources, icon: LibraryBig },
              { title: 'Informes', href: paths.coordination.reports, icon: ChartNoAxesCombined },
          ]
        : []),
    ...(activeRole.value?.code === 'docente'
        ? [{ title: 'Mis sílabos', href: paths.teacher.syllabi, icon: BookOpenCheck }]
        : []),
    ...(activeRole.value
        ? [{ title: 'Configuración', href: roleSetting(activeRole.value.code, 'profile'), icon: Settings }]
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
                        <RouterLink :to="paths.dashboard"><AppLogo /></RouterLink>
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
