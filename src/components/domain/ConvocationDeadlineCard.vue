<script setup lang="ts">
import { formatDateDisplay } from '@/lib/dateDisplay';
import { CalendarRange, Eye } from '@lucide/vue';
import { computed } from 'vue';
import type { DashboardDeadline } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const props = defineProps<{
  deadline: DashboardDeadline;
  audience: 'coordinador' | 'docente';
}>();

const slots = defineSlots<{ actions?: () => unknown }>();
const emit = defineEmits<{ tracking: [] }>();

const formatDate = (value: string): string => formatDateDisplay(value, {
  dateStyle: 'long',
  timeZone: 'UTC',
});

const stateLabel = computed(() => ({
  upcoming: 'Por iniciar',
  active: 'En curso',
  paused: 'Pausada',
  overdue: 'Plazo vencido',
  closed: 'Cerrada',
})[props.deadline.state]);

const elapsed = computed(() => {
  if (['overdue', 'closed'].includes(props.deadline.state)) return 100;
  if (props.deadline.state === 'upcoming') return 0;
  const start = Date.parse(props.deadline.starts_at);
  const due = Date.parse(props.deadline.due_at);
  const total = Math.round((due - start) / 86_400_000);
  if (!Number.isFinite(total) || total <= 0) return 100;
  const done = total - Math.max(0, props.deadline.days_until_due);
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
});

const summary = computed(() => {
  if (props.deadline.state === 'paused') return '';
  if (props.deadline.state === 'overdue') return 'El plazo de entrega venció.';
  if (props.deadline.state === 'closed') return 'La convocatoria institucional está cerrada.';
  if (props.deadline.state === 'upcoming') {
    if (props.deadline.days_until_start === 0) return 'La elaboración inicia hoy.';
    if (props.deadline.days_until_start === 1) return 'La elaboración inicia mañana.';
    return `La elaboración inicia en ${props.deadline.days_until_start} días.`;
  }
  if (props.deadline.days_until_due === 0) return 'La entrega vence hoy.';
  if (props.deadline.days_until_due === 1) return 'Queda 1 día para la entrega.';
  return `Quedan ${props.deadline.days_until_due} días para la entrega`;
});

const teacherSummary = computed(() => {
  const { state, days_until_start: toStart, days_until_due: toDue } = props.deadline;
  const due = formatDate(props.deadline.due_at);
  if (state === 'paused') return 'La convocatoria está pausada.';
  if (state === 'closed') return 'La convocatoria está cerrada.';
  if (state === 'overdue') return `El plazo para enviar sus sílabos a revisión venció el ${due}.`;
  if (state === 'upcoming') {
    if (toStart === 0) return 'La elaboración de sus sílabos inicia hoy.';
    if (toStart === 1) return 'La elaboración de sus sílabos inicia mañana.';
    return `La elaboración de sus sílabos inicia en ${toStart} días, el ${formatDate(props.deadline.starts_at)}.`;
  }
  if (toDue === 0) return 'Hoy es el último día para enviar sus sílabos a revisión.';
  if (toDue === 1) return `Queda 1 día para enviar sus sílabos a revisión: hasta el ${due}.`;
  return `Quedan ${toDue} días para enviar sus sílabos a revisión: hasta el ${due}.`;
});
</script>

<template>
  <Card v-if="audience === 'docente'" class="py-4">
    <CardContent class="flex flex-col gap-3">
      <p class="font-semibold" aria-live="polite">{{ teacherSummary }}</p>
      <Progress :model-value="elapsed" class="h-2" :aria-label="`Avance del plazo: ${elapsed} %`" />
    </CardContent>
  </Card>
  <Card v-else>
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
      <p v-if="summary" class="text-lg font-semibold" aria-live="polite">{{ summary }}</p>
      <div class="flex flex-col gap-2">
        <div class="flex items-end justify-between gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold">Inicio</span>
            <time class="text-sm" :datetime="deadline.starts_at">{{ formatDate(deadline.starts_at) }}</time>
          </div>
          <div class="flex flex-col gap-1 text-right">
            <span class="text-xs font-semibold">Entrega</span>
            <time class="text-sm" :datetime="deadline.due_at">{{ formatDate(deadline.due_at) }}</time>
          </div>
        </div>
        <Progress :model-value="elapsed" class="h-2" :aria-label="`Avance del plazo: ${elapsed} %`" />
      </div>
    </CardContent>
    <CardFooter v-if="deadline.convocation_id || slots.actions" class="flex flex-wrap gap-3">
      <slot name="actions" />
      <Button v-if="deadline.convocation_id" type="button" variant="outline" class="max-sm:w-full" @click="emit('tracking')"><Eye data-icon="inline-start" aria-hidden="true" />Ver seguimiento</Button>
    </CardFooter>
  </Card>
</template>
