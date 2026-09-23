<script setup lang="ts">
import { CalendarRange } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { DashboardDeadline } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { paths } from '@/lib/routes';

const props = defineProps<{
  deadline: DashboardDeadline;
  role: 'coordinador' | 'docente';
}>();

const emit = defineEmits<{ tracking: [] }>();

const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'long',
  timeZone: 'UTC',
}).format(new Date(value));

const stateLabel = computed(() => ({
  upcoming: 'Por iniciar',
  active: 'En curso',
  paused: 'En pausa',
  overdue: 'Plazo vencido',
  closed: 'Cerrada',
})[props.deadline.state]);

const summary = computed(() => {
  if (props.deadline.state === 'paused') return 'No se admiten envíos mientras la convocatoria permanezca en pausa.';
  if (props.deadline.state === 'overdue') return 'El plazo de entrega venció.';
  if (props.deadline.state === 'closed') return 'La convocatoria institucional está cerrada.';
  if (props.deadline.state === 'upcoming') {
    if (props.deadline.days_until_start === 0) return 'La elaboración inicia hoy.';
    if (props.deadline.days_until_start === 1) return 'La elaboración inicia mañana.';
    return `La elaboración inicia en ${props.deadline.days_until_start} días.`;
  }
  if (props.deadline.days_until_due === 0) return 'La entrega vence hoy.';
  if (props.deadline.days_until_due === 1) return 'Queda 1 día para la entrega.';
  return `Quedan ${props.deadline.days_until_due} días para la entrega.`;
});
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <CardTitle class="flex items-center gap-2"><CalendarRange class="size-5" aria-hidden="true" />Plazo de la convocatoria</CardTitle>
          <CardDescription>Período {{ deadline.period }}</CardDescription>
        </div>
        <p class="text-sm font-medium">{{ stateLabel }}</p>
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-5">
      <p class="text-lg font-semibold" aria-live="polite">{{ summary }}</p>
      <div class="grid gap-3 sm:grid-cols-[auto_minmax(2rem,1fr)_auto] sm:items-center">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">Inicio</span>
          <time class="text-sm font-medium" :datetime="deadline.starts_at">{{ formatDate(deadline.starts_at) }}</time>
        </div>
        <Separator class="hidden sm:block" />
        <div class="flex flex-col gap-1 sm:text-right">
          <span class="text-xs text-muted-foreground">Entrega</span>
          <time class="text-sm font-medium" :datetime="deadline.due_at">{{ formatDate(deadline.due_at) }}</time>
        </div>
      </div>
    </CardContent>
    <CardFooter v-if="role === 'docente' || deadline.convocation_id">
      <Button v-if="role === 'docente'" as-child class="max-sm:w-full">
        <RouterLink :to="paths.teacher.syllabi">Continuar mis sílabos</RouterLink>
      </Button>
      <Button v-else type="button" class="max-sm:w-full" @click="emit('tracking')">Ver seguimiento</Button>
    </CardFooter>
  </Card>
</template>
