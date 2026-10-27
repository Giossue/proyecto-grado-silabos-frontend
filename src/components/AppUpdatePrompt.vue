<script setup lang="ts">
import { RefreshCw } from '@lucide/vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { Button } from '@/components/ui/button';

const HOUR = 60 * 60 * 1000;

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW: (_url, registration) => {
    if (registration) setInterval(() => { void registration.update(); }, HOUR);
  },
});
</script>

<template>
  <div v-if="needRefresh" role="status" class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3 text-sm text-card-foreground shadow-menu ring-1 ring-surface-ring max-sm:left-4 max-sm:bottom-[calc(var(--mobile-nav-height)+1rem)]">
    <span class="flex-1">Hay una versión nueva del sistema.</span>
    <Button type="button" variant="ghost" size="sm" @click="needRefresh = false">Después</Button>
    <Button type="button" size="sm" @click="updateServiceWorker(true)"><RefreshCw data-icon="inline-start" aria-hidden="true" />Actualizar</Button>
  </div>
</template>
