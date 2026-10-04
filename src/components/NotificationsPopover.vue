<script setup lang="ts">
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import EmptyState from '@/components/domain/EmptyState.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Bell, BookOpen, CalendarClock, CheckCheck, ClipboardCheck, FileText, Library, MoreHorizontal, Sparkles, UserRound } from '@lucide/vue';
import { computed, onMounted, ref, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '@/api/notifications';
import { useOpenNotification } from '@/composables/useOpenNotification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { paths } from '@/lib/routes';
import { relativeTime } from '@/lib/relativeTime';
import { sessionState } from '@/state/session';

const PREVIEW_LIMIT = 10;
const statusOptions = [{ value: 'all', label: 'Todas' }, { value: 'unread', label: 'No leídas' }];
const updateStatus = (value: string): void => { if (value === 'all' || value === 'unread') status.value = value; };

const route = useRoute();
const { open: openDestination } = useOpenNotification();
const open = ref(false);
const anchor = ref<HTMLElement | null>(null);
const status = ref<'all' | 'unread'>('all');
const items = ref<Notification[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);

const hasActiveRole = computed(() => sessionState.current.value?.active_role != null);
const isNotificationsPage = computed(() => route.path.endsWith('/notificaciones') || route.path === paths.notifications);

const iconFor = (tipo: string): Component => {
    if (tipo.startsWith('biblioteca')) return Library;
    if (tipo.startsWith('documento')) return FileText;
    if (tipo.startsWith('ia')) return Sparkles;
    if (tipo.startsWith('fuente_academica')) return BookOpen;
    if (tipo.startsWith('proceso') || tipo.startsWith('convocatoria')) return CalendarClock;
    if (tipo.startsWith('silabo')) return ClipboardCheck;
    if (tipo.startsWith('docente') || tipo.startsWith('coordinacion') || tipo.startsWith('usuario')) return UserRound;
    return Bell;
};

const load = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
        const result = await getNotifications(status.value);
        items.value = result.notifications.data.slice(0, PREVIEW_LIMIT);
        unreadCount.value = result.unread_count;
    } catch {
        error.value = 'No se pudieron cargar las notificaciones.';
    } finally {
        loading.value = false;
    }
};

const refreshCount = async (): Promise<void> => {
    try {
        unreadCount.value = (await getNotifications('unread')).unread_count;
    } catch {
        unreadCount.value = 0;
    }
};

const select = async (notification: Notification): Promise<void> => {
    const unread = notification.leido_en === null;
    if (notification.has_destination) {
        open.value = false;
        await openDestination(notification);
    } else if (unread) {
        notification.leido_en = new Date().toISOString();
        void markNotificationRead(notification.id).catch(() => undefined);
    }
    if (unread) unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const readAll = async (): Promise<void> => {
    try {
        await markAllNotificationsRead();
    } catch {
        error.value = 'No se pudieron marcar las notificaciones como leídas.';
        return;
    }
    await load();
};

watch(open, (value) => {
    if (value) void load();
});
watch(status, () => {
    if (open.value) void load();
});
watch(isNotificationsPage, (current, previous) => {
    if (previous && !current) void refreshCount();
});
onMounted(refreshCount);

const ignoreBell = (event: Event): void => {
    const target = event.target as Node | null;
    if (target && anchor.value?.contains(target)) event.preventDefault();
};
</script>

<template>
    <Popover v-model:open="open">
        <TooltipProvider :delay-duration="150">
            <PopoverAnchor as-child>
                <span ref="anchor" class="inline-flex">
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button
                                type="button"
                                :variant="open || isNotificationsPage ? 'secondary' : 'ghost'"
                                size="icon-sm"
                                class="relative"
                                aria-label="Notificaciones"
                                aria-haspopup="dialog"
                                :aria-expanded="open"
                                @click="open = !open"
                            >
                                <Bell data-icon="inline-start" aria-hidden="true" />
                                <Badge v-if="unreadCount > 0" as="span" class="notification-counter absolute -top-1 -right-1 min-w-5 px-1" aria-hidden="true">
                                    {{ unreadCount > 99 ? '99+' : unreadCount }}
                                </Badge>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Notificaciones</TooltipContent>
                    </Tooltip>
                </span>
            </PopoverAnchor>
        </TooltipProvider>
        <PopoverContent align="end" @interact-outside="ignoreBell" class="flex w-(--notifications-width) flex-col gap-3 p-0">
            <div class="flex items-center justify-between px-4 pt-4">
                <h2 class="text-lg font-semibold">Notificaciones</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Opciones de notificaciones">
                            <MoreHorizontal aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem :disabled="unreadCount === 0" @select="readAll">
                            <CheckCheck aria-hidden="true" />
                            Marcar todas como leídas
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ChoiceGroup :model-value="status" :options="statusOptions" label="Filtrar notificaciones" class="px-4" @update:model-value="updateStatus" />

            <div class="max-h-(--notifications-max-height) overflow-y-auto px-2" :class="{ 'pb-3': !hasActiveRole }" aria-live="polite">
                <div v-if="loading && items.length === 0" class="flex justify-center py-10">
                    <Spinner />
                </div>
                <FeedbackAlert v-else-if="error" :message="error" />
                <EmptyState v-else-if="items.length === 0" :title="status === 'unread' ? 'No tiene notificaciones sin leer.' : 'No tiene notificaciones.'" />
                <ul v-else class="flex flex-col">
                    <li v-for="notification in items" :key="notification.id">
                        <Button
                            type="button" variant="ghost" size="row"
                            @click="select(notification)"
                        >
                            <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <component :is="iconFor(notification.tipo)" class="size-5" aria-hidden="true" />
                            </span>
                            <span class="min-w-0 flex-1" :class="notification.leido_en === null ? '' : 'text-muted-foreground'">
                                <span class="block text-sm font-medium">{{ notification.titulo }}</span>
                                <span class="line-clamp-2 text-sm">{{ notification.mensaje }}</span>
                                <span v-if="notification.context" class="mt-0.5 block text-xs text-muted-foreground">
                                    {{ notification.context }}
                                </span>
                                <span
                                    class="mt-0.5 block text-xs"
                                    :class="notification.leido_en === null ? 'font-medium text-primary' : 'text-muted-foreground'"
                                >
                                    {{ relativeTime(notification.notificado_en) }}
                                </span>
                            </span>
                            <span
                                v-if="notification.leido_en === null"
                                class="mt-4 size-2.5 shrink-0 rounded-full bg-brand-accent"
                                aria-label="Sin leer"
                            />
                        </Button>
                    </li>
                </ul>
            </div>

            <div v-if="hasActiveRole" class="px-4 pb-4">
                <Button as-child variant="secondary" class="w-full">
                    <RouterLink :to="paths.notifications" @click="open = false">
                        Ver todas las notificaciones
                    </RouterLink>
                </Button>
            </div>
        </PopoverContent>
    </Popover>
</template>
