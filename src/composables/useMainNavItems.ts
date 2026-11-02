import {
    BookOpenCheck,
    Building2,
    CalendarRange,
    ClipboardCheck,
    FileStack,
    FileText,
    FolderOpen,
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

export function useMainNavItems(): ComputedRef<NavItem[]> {
    const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
    const mainNavItems = computed<NavItem[]>(() => [
        ...(activeRole.value?.code === 'administrador'
            ? [
                  { title: 'Convocatorias', href: paths.admin.convocations, icon: CalendarRange },
                  { title: 'Usuarios y roles', href: paths.admin.users, icon: UsersRound },
                  {
                      title: 'Facultades y carreras',
                      href: paths.admin.academic,
                      icon: Building2,
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
                  { title: 'Revisión', href: paths.coordination.reviews, icon: ClipboardCheck },
                  { title: 'Materias y asignaciones', href: paths.coordination.scheduledSubjects, icon: Building2 },
                  { title: 'Docentes', href: paths.coordination.teachers, icon: UsersRound },
                  { title: 'Proyecto de carrera', href: paths.coordination.careerProject, icon: FolderOpen },
                  { title: 'Malla', href: paths.coordination.curriculum, icon: BookOpenCheck },
              ]
            : []),
        ...(activeRole.value?.code === 'docente'
            ? [
                  { title: 'Mis sílabos', href: paths.teacher.syllabi, icon: BookOpenCheck },
                  { title: 'Documentos de apoyo', href: paths.teacher.supportDocuments, icon: FileText },
              ]
            : []),
        ...(activeRole.value?.code === 'bibliotecario'
            ? [{ title: 'Revisiones de biblioteca', href: paths.library.reviews, icon: Library }]
            : []),
    ]);
    return mainNavItems;
}

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
