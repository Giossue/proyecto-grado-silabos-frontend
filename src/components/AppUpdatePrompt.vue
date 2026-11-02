<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { onBeforeUnmount, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { reloadPage } from '@/lib/pageReload';

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

// Si otra pestaña ya activó la versión nueva, aquí no queda nada que activar y el botón no recargaba: se recarga
// igual a los pocos segundos. Mientras tanto, el botón queda ocupado para que no parezca que no hace nada.
const FALLBACK_RELOAD_MS = 3000;
const updating = ref(false);
let fallback: ReturnType<typeof setTimeout> | undefined;
const update = (): void => {
  if (updating.value) return;
  updating.value = true;
  fallback = setTimeout(reloadPage, FALLBACK_RELOAD_MS);
  void updateServiceWorker(true);
};

// Cuando otra pestaña activa la versión nueva, esta sigue con archivos viejos: se le muestra el mismo aviso.
const onControllerChange = (): void => { if (!updating.value) needRefresh.value = true; };
navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(fallback);
  navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
  if (onVisible) document.removeEventListener('visibilitychange', onVisible);
});
</script>

<template>
  <div v-if="needRefresh" role="status" class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3 text-sm text-card-foreground shadow-menu ring-1 ring-surface-ring max-sm:left-4 max-sm:bottom-[calc(var(--mobile-nav-height)+1rem)]">
    <span class="flex-1">Hay una versión nueva del sistema</span>
    <Button type="button" size="sm" :disabled="updating" @click="update"><Spinner v-if="updating" data-icon="inline-start" /><RefreshCw v-else data-icon="inline-start" aria-hidden="true" />Actualizar</Button>
  </div>
</template>
