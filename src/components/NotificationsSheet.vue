<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import EmptyState from '@/components/domain/EmptyState.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Bell, BookOpen, CalendarClock, CheckCheck, ClipboardCheck, FileText, Library, Sparkles, UserRound, X } from '@lucide/vue';
import { computed, onMounted, ref, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '@/api/notifications';
import { useOpenNotification } from '@/composables/useOpenNotification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
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
</script>

<template>
    <TooltipProvider :delay-duration="150">
        <Tooltip>
            <TooltipTrigger as-child>
                <Button
                    type="button"
                    :variant="open || isNotificationsPage ? 'secondary' : 'ghost'"
                    size="icon-sm"
                    class="relative"
                    :aria-label="unreadCount > 0 ? 'Notificaciones sin leer' : 'Notificaciones'"
                    aria-haspopup="dialog"
                    :aria-expanded="open"
                    @click="open = true"
                >
                    <Bell data-icon="inline-start" aria-hidden="true" />
                    <Badge
                        v-if="unreadCount > 0"
                        as="span"
                        variant="destructive"
                        class="absolute top-1 right-1 size-1.5 border-0 p-0 ring-1 ring-background"
                        aria-hidden="true"
                    />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Notificaciones</TooltipContent>
        </Tooltip>
    </TooltipProvider>
    <Sheet v-model:open="open">
        <SheetContent
            :aria-describedby="undefined"
            @interact-outside="open = false"
            class="top-0 right-0 left-auto h-dvh max-h-none w-full translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-r-0 duration-300 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md"
        >
            <div class="flex items-center justify-between gap-2 border-b px-6 py-4">
                <SheetTitle class="text-lg font-semibold">Notificaciones</SheetTitle>
                <TooltipProvider :delay-duration="150">
                <div class="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <span class="inline-flex">
                                <Button type="button" variant="ghost" size="icon-sm" aria-label="Marcar todas como leídas" :disabled="unreadCount === 0" @click="readAll">
                                    <CheckCheck aria-hidden="true" />
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Marcar todas como leídas</TooltipContent>
                    </Tooltip>
                    <SheetClose as-child>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar notificaciones"><X aria-hidden="true" /></Button>
                    </SheetClose>
                </div>
                </TooltipProvider>
            </div>

            <ChoiceGroup :model-value="status" :options="statusOptions" label="Filtrar notificaciones" class="px-6 py-3" @update:model-value="updateStatus" />

            <ScrollArea class="min-h-0 flex-1">
                <div aria-live="polite">
                    <div v-if="loading && items.length === 0" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando notificaciones">
                        <span class="sr-only">Cargando notificaciones…</span>
                        <div aria-hidden="true" class="flex flex-col divide-y">
                            <div v-for="item in 3" :key="item" class="flex items-start gap-3 px-6 py-4">
                                <Skeleton class="size-5 shrink-0 rounded-full" />
                                <div class="flex min-w-0 flex-1 flex-col gap-2">
                                    <Skeleton class="h-4 w-3/4" />
                                    <Skeleton class="h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <FeedbackAlert v-else-if="error" :message="error" class="mx-6" />
                    <EmptyState v-else-if="items.length === 0" :title="status === 'unread' ? 'No tiene notificaciones sin leer.' : 'No tiene notificaciones.'" />
                    <ul v-else class="flex flex-col divide-y border-t">
                        <li v-for="notification in items" :key="notification.id">
                            <button
                                type="button"
                                class="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-hidden"
                                @click="select(notification)"
                            >
                                <component :is="iconFor(notification.tipo)" class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span class="min-w-0 flex-1">
                                    <span class="flex items-baseline justify-between gap-3">
                                        <span class="text-sm font-medium">{{ notification.titulo }}</span>
                                        <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                            {{ relativeTime(notification.notificado_en) }}
                                            <span v-if="notification.leido_en === null" class="size-2 rounded-full bg-brand-accent" aria-label="Sin leer" />
                                        </span>
                                    </span>
                                    <span class="mt-1 block text-sm text-muted-foreground">{{ notification.mensaje }}</span>
                                    <span v-if="notification.context" class="mt-1 block text-xs text-muted-foreground">{{ notification.context }}</span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>
            </ScrollArea>

            <div v-if="hasActiveRole" class="border-t px-6 py-4">
                <Button as-child variant="secondary" class="w-full">
                    <RouterLink :to="paths.notifications" @click="open = false">
                        Ver todas las notificaciones
                    </RouterLink>
                </Button>
            </div>
        </SheetContent>
    </Sheet>
</template>
