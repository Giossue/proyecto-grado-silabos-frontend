import type { LucideIcon } from '@lucide/vue';

export type NavigableHref = string | { url: string };

export type BreadcrumbItem = {
    title: string;
    /** Sin destino cuando la miga es la pantalla actual: no se enlaza a sí misma. */
    href?: NavigableHref;
};

export type NavItem = {
    title: string;
    href: NavigableHref;
    icon?: LucideIcon;
    isActive?: boolean;
    badge?: number;
    items?: NavItem[];
};
