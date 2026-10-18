<script setup lang="ts">
import { formatDateDisplay } from '@/lib/dateDisplay';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationsResponse } from '@/api/notifications';
import TablePagination from '@/components/domain/TablePagination.vue';
import { CheckCheck, ExternalLink } from '@lucide/vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useOpenNotification } from '@/composables/useOpenNotification';
import { paths } from '@/lib/routes';

const router = useRouter();
const { open, openingId } = useOpenNotification();
const result = ref<NotificationsResponse | null>(null);
const status = ref<'all' | 'unread'>('all');
const error = ref<string | null>(null);
const loading = ref(true);
const pending = ref(false);

const load = async (page = 1): Promise<void> => {
  loading.value = true; error.value = null;
  try { result.value = await getNotifications(status.value, page); } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = 'No se pudieron cargar las notificaciones.';
  } finally { loading.value = false; }
};
const mutate = async (operation: () => Promise<unknown>, page = 1): Promise<void> => {
  pending.value = true; error.value = null;
  try { await operation(); await load(page); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo actualizar la notificación.'; }
  finally { pending.value = false; }
};
const read = (id: string): Promise<void> => mutate(() => markNotificationRead(id), result.value?.notifications.current_page ?? 1);
const readAll = (): Promise<void> => mutate(() => markAllNotificationsRead());
const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' });
onMounted(load);
</script>

<template>
  <PageFrame title="Notificaciones" description="Avisos de lo que va pasando con sus sílabos y sus documentos." size="wide">
    <template #actions><Button v-if="result?.unread_count" type="button" variant="outline" :disabled="pending" @click="readAll"><Spinner v-if="pending" /><CheckCheck v-else aria-hidden="true" />Marcar todas como leídas</Button></template>
    <nav class="flex gap-2" aria-label="Filtrar notificaciones"><Button :variant="status === 'all' ? 'default' : 'outline'" :disabled="pending" @click="status = 'all'; load()">Todas</Button><Button :variant="status === 'unread' ? 'default' : 'outline'" :disabled="pending" @click="status = 'unread'; load()">No leídas</Button></nav>
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-if="loading && !result" variant="notifications" />
    <Card v-else-if="result"><CardContent class="flex flex-col gap-3">
      <article v-for="notification in result.notifications.data" :key="notification.id" class="rounded-lg ring-1 ring-surface-ring p-4" :class="notification.leido_en === null ? 'bg-muted/40' : ''"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h2 class="font-medium">{{ notification.titulo }}</h2><Badge v-if="notification.leido_en === null" variant="secondary">Nueva</Badge></div><p class="mt-1 text-sm">{{ notification.mensaje }}</p><p class="mt-2 text-xs text-muted-foreground">{{ formatDate(notification.notificado_en) }}<template v-if="notification.context"> · {{ notification.context }}</template></p></div><div class="flex shrink-0 flex-wrap gap-2"><Button v-if="!notification.leido_en" type="button" size="sm" variant="outline" :disabled="pending" @click="read(notification.id)">Marcar leída</Button><Button v-if="notification.has_destination" type="button" size="sm" :disabled="openingId !== null" @click="open(notification)"><Spinner v-if="openingId === notification.id" data-icon="inline-start" /><ExternalLink v-else data-icon="inline-start" aria-hidden="true" />Abrir</Button></div></div></article>
      <div v-if="result.notifications.data.length === 0" class="py-12 text-center text-sm text-muted-foreground">No existen notificaciones.</div>
    </CardContent></Card>
    <TablePagination v-if="result && result.notifications.last_page > 1" :meta="result.notifications" label="Paginación de notificaciones" @update:page="load" />
  </PageFrame>
</template>
