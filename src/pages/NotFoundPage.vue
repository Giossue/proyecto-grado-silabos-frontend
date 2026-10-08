<script setup lang="ts">
import { House } from '@lucide/vue';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/routes';
</script>

<template>
  <main id="contenido" tabindex="-1" class="flex min-h-svh outline-none items-center justify-center bg-background px-6 py-12">
    <section class="flex w-full max-w-md flex-col gap-4 text-center">
      <p class="text-sm font-medium text-muted-foreground">Error 404</p>
      <h1 class="text-2xl font-semibold tracking-tight">Página no encontrada</h1>
      <p class="text-sm text-muted-foreground">La dirección solicitada no corresponde a una pantalla disponible.</p>
      <Button as-child>
        <RouterLink :to="paths.dashboard"><House data-icon="inline-start" aria-hidden="true" />Volver al panel</RouterLink>
      </Button>
    </section>
  </main>
</template>
