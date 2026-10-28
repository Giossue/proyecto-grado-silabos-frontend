<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { onBeforeUnmount } from 'vue';
import { Button } from '@/components/ui/button';

const CHECK_EVERY = 5 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | undefined;
let onVisible: (() => void) | undefined;

/** Busca la versión nueva cada pocos minutos y al volver a la pestaña, para que el aviso llegue casi a la vez a todos. */
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW: (_url, registration) => {
    if (!registration) return;
    const check = (): void => { if (navigator.onLine) void registration.update(); };
    timer = setInterval(check, CHECK_EVERY);
    onVisible = (): void => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
  },
});
onBeforeUnmount(() => {
  clearInterval(timer);
  if (onVisible) document.removeEventListener('visibilitychange', onVisible);
});
</script>

<template>
  <div v-if="needRefresh" role="status" class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3 text-sm text-card-foreground shadow-menu ring-1 ring-surface-ring max-sm:left-4 max-sm:bottom-[calc(var(--mobile-nav-height)+1rem)]">
    <span class="flex-1">Hay una versión nueva del sistema.</span>
    <Button type="button" size="sm" @click="updateServiceWorker(true)"><RefreshCw data-icon="inline-start" aria-hidden="true" />Actualizar</Button>
  </div>
</template>
