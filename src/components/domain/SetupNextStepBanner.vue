<script setup lang="ts">
import { ListChecks } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { setupChecklistState } from '@/state/setupChecklist';

/** Franja fija de Administración y Coordinación: dice qué paso de «Antes de empezar» sigue y abre ese panel. */
const steps = setupChecklistState.steps;
const index = computed(() => steps.value.findIndex((step) => !step.done));
/** Con los pasos hechos, queda abrir la convocatoria: se dice sin número, como en el panel. */
const start = computed(() => (setupChecklistState.start.value?.done === false ? setupChecklistState.start.value : null));
const next = computed(() => (index.value === -1 ? start.value : steps.value[index.value]));
const plain = (text: string): string => text.replace(/\.$/, '');
</script>

<template>
  <!-- Alto fijo: con pistas largas o cortas, la franja mide lo mismo en todas las pantallas -->
  <div v-if="next" role="status" data-setup-next-step class="flex h-11 items-center gap-3 border-y border-primary/20 bg-primary/5 px-4 text-sm sm:px-6">
    <ListChecks class="size-4 shrink-0 text-primary" aria-hidden="true" />
    <span class="shrink-0 font-medium max-sm:min-w-0 max-sm:shrink max-sm:truncate">{{ index === -1 ? 'Último paso' : `Paso ${index + 1} de ${steps.length}` }}: {{ plain(next.label) }}</span>
    <TooltipProvider><Tooltip><TooltipTrigger as-child>
      <span class="min-w-0 truncate text-muted-foreground max-sm:hidden">{{ plain(next.hint) }}</span>
    </TooltipTrigger><TooltipContent class="max-w-sm">{{ plain(next.hint) }}</TooltipContent></Tooltip></TooltipProvider>
    <Button type="button" variant="link" size="sm" class="h-auto shrink-0 px-0" @click="setupChecklistState.requestOpen()">Ver los pasos</Button>
  </div>
</template>
