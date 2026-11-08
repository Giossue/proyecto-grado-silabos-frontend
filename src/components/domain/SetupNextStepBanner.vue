<script setup lang="ts">
import { ArrowRight, ListChecks } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { setupRoutes } from '@/lib/setupRoutes';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';

/** Franja fija de Administración y Coordinación: dice qué paso de «Antes de empezar» sigue y lleva a su pantalla. */
const route = useRoute();
const steps = computed(() => setupChecklistState.setup.value?.steps ?? []);
const index = computed(() => steps.value.findIndex((step) => !step.done));
const next = computed(() => (index.value === -1 ? null : steps.value[index.value]));
const target = computed(() => (next.value ? setupRoutes[sessionState.current.value?.active_role?.code ?? '']?.[next.value.key] ?? null : null));
const here = computed(() => target.value !== null && route.path === target.value.split('?')[0]);
const plain = (text: string): string => text.replace(/\.$/, '');
</script>

<template>
  <div v-if="next" role="status" data-setup-next-step class="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-primary/20 bg-primary/5 px-4 py-2.5 text-sm sm:px-6">
    <ListChecks class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <span class="font-medium">Paso {{ index + 1 }} de {{ steps.length }}: {{ plain(next.label) }}</span>
    <span class="text-muted-foreground">{{ plain(next.hint) }}</span>
    <Button v-if="target && !here" as-child size="sm" variant="outline" class="ml-auto h-7">
      <RouterLink :to="target">Ir<ArrowRight data-icon="inline-end" aria-hidden="true" /></RouterLink>
    </Button>
  </div>
</template>
