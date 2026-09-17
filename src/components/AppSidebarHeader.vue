<script setup lang="ts">
import { Bell } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import SetupProgress from '@/components/SetupProgress.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getNotifications } from '@/api/notifications';
import { paths } from '@/lib/routes';
import type { BreadcrumbItem } from '@/types';

const props = withDefaults(defineProps<{ breadcrumbs?: BreadcrumbItem[]; pageTitle?: string }>(), {
    breadcrumbs: () => [],
    pageTitle: '',
});
const route = useRoute();
const unreadCount = ref(0);
const trail = computed<BreadcrumbItem[]>(() => {
    // La miga representa únicamente la pantalla actual. No se construye una
    // cadena padre > detalle, aunque la ruta aporte un contexto anterior.
    if (props.pageTitle.trim() !== '') return [{ title: props.pageTitle }];
    const last = props.breadcrumbs.at(-1);
    return last ? [last] : [];
});
const isNotificationsPage = computed(() => route.path.endsWith('/notificaciones') || route.path === paths.notifications);

onMounted(async () => {
    try {
        unreadCount.value = (await getNotifications('unread')).unread_count;
    } catch {
        unreadCount.value = 0;
    }
});
</script>

<template>
    <header
        class="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-sidebar-border/70 bg-background px-6 pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(3rem+env(safe-area-inset-top))] md:px-4"
    >
        <div class="flex items-center gap-2">
            <SidebarTrigger class="-ml-1" />
            <Breadcrumbs v-if="trail.length > 0" :breadcrumbs="trail" />
        </div>
        <div class="ml-auto flex items-center gap-2">
            <SetupProgress />
            <Tooltip>
                <TooltipTrigger as-child>
                    <Button
                        as-child
                        :variant="isNotificationsPage ? 'secondary' : 'ghost'"
                        size="icon-sm"
                        class="relative"
                        aria-label="Notificaciones"
                        :aria-current="isNotificationsPage ? 'page' : undefined"
                    >
                        <RouterLink :to="paths.notifications">
                            <Bell data-icon="inline-start" aria-hidden="true" />
                            <Badge v-if="unreadCount > 0" as="span" class="absolute -top-1 -right-1 min-w-5 px-1" aria-hidden="true">
                                {{ unreadCount > 99 ? '99+' : unreadCount }}
                            </Badge>
                        </RouterLink>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Notificaciones</TooltipContent>
            </Tooltip>
            <AppearanceToggle />
        </div>
    </header>
</template>
