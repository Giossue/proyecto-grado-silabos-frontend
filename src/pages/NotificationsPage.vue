<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationsResponse } from '@/api/notifications';
import PaginationControls from '@/components/PaginationControls.vue';

const router = useRouter();
const result = ref<NotificationsResponse | null>(null);
const status = ref<'all' | 'unread'>('all');
const error = ref<string | null>(null);

const load = async (page = 1): Promise<void> => {
  try { result.value = await getNotifications(status.value, page); } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace('/ingresar'); return; }
    error.value = 'No se pudieron cargar las notificaciones.';
  }
};
const read = async (id: string): Promise<void> => { await markNotificationRead(id); await load(result.value?.notifications.current_page); };
const readAll = async (): Promise<void> => { await markAllNotificationsRead(); await load(); };
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
onMounted(load);
</script>

<template>
  <main class="app-page">
    <header class="app-header"><div><p class="eyebrow">Sílabos UEB</p><h1>Notificaciones</h1></div><RouterLink class="back-link" to="/panel">Volver al panel</RouterLink></header>
    <div class="header-actions"><button :disabled="status === 'all'" @click="status = 'all'; load()">Todas</button><button :disabled="status === 'unread'" @click="status = 'unread'; load()">No leídas</button><button v-if="result?.unread_count" @click="readAll">Marcar todas leídas</button></div>
    <p v-if="error" role="alert">{{ error }}</p>
    <section v-else-if="result" class="detail-card"><p v-if="!result.notifications.data.length">No tiene notificaciones.</p><article v-for="notification in result.notifications.data" :key="notification.id" class="notification-item"><div><strong>{{ notification.titulo }}</strong><p>{{ notification.mensaje }}</p><small>{{ formatDate(notification.notificado_en) }}</small></div><div class="header-actions"><button v-if="!notification.leido_en" @click="read(notification.id)">Marcar leída</button><RouterLink v-if="notification.resource_path" class="back-link" :to="notification.resource_path">Abrir</RouterLink></div></article><PaginationControls :current-page="result.notifications.current_page" :last-page="result.notifications.last_page" :total="result.notifications.total" @change="load" /></section>
  </main>
</template>
