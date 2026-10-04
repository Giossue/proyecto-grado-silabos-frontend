import {
    BookOpenCheck,
    Building2,
    CalendarRange,
    ClipboardCheck,
    FileStack,
    LayoutGrid,
    Library,
    ScrollText,
    UsersRound,
} from '@lucide/vue';
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import type { NavItem } from '@/types';

// Ítems del menú lateral según el rol activo; compartidos con la cabecera.
export function useMainNavItems(): ComputedRef<NavItem[]> {
    const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
    const mainNavItems = computed<NavItem[]>(() => [
        ...(activeRole.value?.code === 'administrador'
            ? [{ title: 'Panel', href: paths.admin.panel, icon: LayoutGrid }]
            : []),
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
                          { title: 'Carreras', href: paths.admin.academicWithSection('carrera') },
                      ],
                  },
                  { title: 'Plantilla', href: paths.admin.template, icon: FileStack },
                  {
                      title: 'Auditoría',
                      href: paths.admin.audit,
                      icon: ScrollText,
                  },
              ]
            : []),
        ...(activeRole.value?.code === 'coordinador'
            ? [
                  { title: 'Panel', href: paths.coordination.panel, icon: LayoutGrid },
                  { title: 'Convocatorias', href: paths.coordination.convocations, icon: CalendarRange },
                  { title: 'Revisión', href: paths.coordination.reviews, icon: ClipboardCheck },
                  { title: 'Materias y asignaciones', href: paths.coordination.scheduledSubjects, icon: Building2 },
                  { title: 'Malla', href: paths.coordination.curriculum, icon: BookOpenCheck },
              ]
            : []),
        ...(activeRole.value?.code === 'docente'
            ? [{ title: 'Mis sílabos', href: paths.teacher.syllabi, icon: BookOpenCheck }]
            : []),
        ...(activeRole.value?.code === 'bibliotecario'
            ? [
                  { title: 'Panel', href: paths.library.panel, icon: LayoutGrid },
                  { title: 'Revisiones de biblioteca', href: paths.library.reviews, icon: Library },
              ]
            : []),
    ]);
    return mainNavItems;
}

// Ítem del menú que corresponde a la ruta actual (hijo antes que padre). El hijo
// hereda el icono del padre porque los subítems no tienen uno propio.
export function useActiveNavItem(): ComputedRef<NavItem | null> {
    const items = useMainNavItems();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    return computed(() => {
        for (const item of items.value) {
            const child = item.items?.find((c) => isCurrentOrParentUrl(c.href));
            if (child) return { ...child, icon: child.icon ?? item.icon };
            if (isCurrentOrParentUrl(item.href)) return item;
        }
        return null;
    });
}
