<script setup lang="ts">
import { CalendarClock } from '@lucide/vue';
import { computed } from 'vue';
import type { DashboardDeadline } from '@/api/dashboard';
import { Progress } from '@/components/ui/progress';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { deadlineElapsed } from '@/lib/deadline';

const props = defineProps<{ deadline: DashboardDeadline }>();

const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'long', timeZone: 'UTC' });
const elapsed = computed(() => deadlineElapsed(props.deadline));
const showProgress = computed(() => !['paused', 'closed'].includes(props.deadline.state));

const notice = computed((): { headline: string; detail: string | null } => {
  const { state, days_until_start: toStart, days_until_due: toDue } = props.deadline;
  const due = formatDate(props.deadline.due_at);
  if (state === 'paused') return { headline: 'La convocatoria está pausada', detail: null };
  if (state === 'closed') return { headline: 'La convocatoria está cerrada', detail: null };
  if (state === 'overdue') return { headline: 'Venció el plazo para enviar sus sílabos a revisión', detail: `Era hasta el ${due}.` };
  if (state === 'upcoming') {
    const when = toStart === 0 ? 'hoy' : toStart === 1 ? 'mañana' : `en ${toStart} días`;
    return { headline: `La elaboración de sus sílabos inicia ${when}`, detail: `Podrá enviarlos a revisión hasta el ${due}.` };
  }
  if (toDue === 0) return { headline: 'Hoy es el último día para enviar sus sílabos a revisión', detail: null };
  return { headline: `${toDue === 1 ? 'Queda 1 día' : `Quedan ${toDue} días`} para enviar sus sílabos a revisión`, detail: `Hasta el ${due}.` };
});
</script>

<template>
  <div role="status" class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-foreground sm:px-6">
    <CalendarClock class="size-4 shrink-0 text-warning" aria-hidden="true" />
    <span class="font-medium">{{ notice.headline }}</span>
    <span v-if="notice.detail" class="text-muted-foreground">{{ notice.detail }}</span>
    <Progress v-if="showProgress" :model-value="elapsed" tone="warning" class="h-1.5 w-full bg-warning/20 sm:ml-auto sm:w-40" :aria-label="`Avance del plazo: ${elapsed} %`" />
  </div>
</template>
