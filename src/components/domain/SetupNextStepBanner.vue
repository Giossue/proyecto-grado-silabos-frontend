<script setup lang="ts">
import { ArrowRight, ListChecks } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  <!-- Alto fijo: con o sin «Ir» y con pistas largas o cortas, la franja mide lo mismo en todas las pantallas -->
  <div v-if="next" role="status" data-setup-next-step class="flex h-11 items-center gap-3 border-y border-primary/20 bg-primary/5 px-4 text-sm sm:px-6">
    <ListChecks class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <span class="shrink-0 font-medium max-sm:min-w-0 max-sm:shrink max-sm:truncate">Paso {{ index + 1 }} de {{ steps.length }}: {{ plain(next.label) }}</span>
    <TooltipProvider><Tooltip><TooltipTrigger as-child>
      <span class="min-w-0 flex-1 truncate text-muted-foreground max-sm:hidden">{{ plain(next.hint) }}</span>
    </TooltipTrigger><TooltipContent class="max-w-sm">{{ plain(next.hint) }}</TooltipContent></Tooltip></TooltipProvider>
    <Button v-if="target && !here" as-child size="sm" variant="outline" class="ml-auto h-7 shrink-0">
      <RouterLink :to="target">Ir<ArrowRight data-icon="inline-end" aria-hidden="true" /></RouterLink>
    </Button>
  </div>
</template>
