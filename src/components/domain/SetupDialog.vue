<script setup lang="ts">
import { ArrowRight, Check, ListChecks } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { SetupChecklist } from '@/api/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { withoutEndPeriod } from '@/lib/text';

/** Pasos de configuración previos a abrir la convocatoria; el paso `startKey` es el botón de la pantalla y no se lista. */
const props = defineProps<{ setup: SetupChecklist; routes: Record<string, string>; startKey: string }>();

const steps = computed(() => props.setup.steps.filter((step) => step.key !== props.startKey));
const done = computed(() => steps.value.filter((step) => step.done).length);
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button type="button" variant="outline"><ListChecks data-icon="inline-start" aria-hidden="true" />Puesta en marcha</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ setup.title }}</DialogTitle>
        <DialogDescription>Complete estos pasos para poder abrir la convocatoria.</DialogDescription>
      </DialogHeader>
      <div class="flex items-center gap-3">
        <Progress :model-value="done" :max="steps.length" class="flex-1" :aria-label="`${done} de ${steps.length} pasos`" />
        <span class="text-sm text-muted-foreground tabular-nums">{{ done }} de {{ steps.length }}</span>
      </div>
      <ol class="flex flex-col gap-2">
        <li v-for="(step, index) in steps" :key="step.key" class="flex items-center gap-3 rounded-md p-2" :data-done="step.done">
          <Badge size="step" :variant="step.done ? 'default' : 'outline'" class="shrink-0">
            <Check v-if="step.done" aria-label="Completado" /><template v-else>{{ index + 1 }}</template>
          </Badge>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ withoutEndPeriod(step.label) }}</p>
            <p v-if="!step.done" class="text-sm text-muted-foreground">{{ withoutEndPeriod(step.hint) }}</p>
          </div>
          <Button v-if="routes[step.key]" as-child size="sm" :variant="step.done ? 'outline' : 'default'" class="shrink-0">
            <RouterLink :to="routes[step.key]!">Ir<ArrowRight data-icon="inline-end" aria-hidden="true" /></RouterLink>
          </Button>
        </li>
      </ol>
      <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
