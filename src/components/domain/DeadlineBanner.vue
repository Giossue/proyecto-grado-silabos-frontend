<script setup lang="ts">
import { CalendarClock } from '@lucide/vue';
import { computed } from 'vue';
import type { DashboardDeadline } from '@/api/dashboard';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { cn } from '@/lib/utils';

type Audience = 'docente' | 'coordinador' | 'bibliotecario';

const props = defineProps<{ deadline: DashboardDeadline; audience: Audience }>();

const tasks: Record<Audience, { task: string; upcoming: string; until: (due: string) => string }> = {
  docente: { task: 'enviar sus sílabos a revisión', upcoming: 'La elaboración de sus sílabos inicia', until: (due) => `Podrá enviarlos a revisión hasta el ${due}` },
  coordinador: { task: 'recibir y revisar los sílabos de su carrera', upcoming: 'La elaboración de los sílabos inicia', until: (due) => `Los docentes podrán enviarlos hasta el ${due}` },
  bibliotecario: { task: 'revisar y firmar los sílabos', upcoming: 'La elaboración de los sílabos inicia', until: (due) => `Deben quedar revisados y firmados hasta el ${due}` },
};

const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'long', timeZone: 'UTC' });

const overdue = computed(() => props.deadline.state === 'overdue');

const overdueNotice: Record<Audience, (due: string) => { headline: string; detail: string }> = {
  docente: (due) => ({ headline: 'Venció el plazo para enviar sus sílabos a revisión', detail: `Era hasta el ${due}. Pida una prórroga a Administración` }),
  coordinador: (due) => ({ headline: 'Venció el plazo de entrega de los sílabos', detail: `Era hasta el ${due}. Solo puede revisar lo ya enviado` }),
  bibliotecario: (due) => ({ headline: 'Venció el plazo de entrega de los sílabos', detail: `Era hasta el ${due}. Solo puede revisar lo ya enviado` }),
};

const notice = computed((): { headline: string; detail: string | null } => {
  const { state, days_until_start: toStart, days_until_due: toDue } = props.deadline;
  const { task, upcoming, until } = tasks[props.audience];
  const due = formatDate(props.deadline.due_at);
  if (state === 'paused') return { headline: 'La convocatoria está pausada', detail: null };
  if (state === 'closed') return { headline: 'La convocatoria está cerrada', detail: null };
  if (state === 'overdue') return overdueNotice[props.audience](due);
  if (state === 'upcoming') {
    const when = toStart === 0 ? 'hoy' : toStart === 1 ? 'mañana' : `en ${toStart} días`;
    return { headline: `${upcoming} ${when}`, detail: until(due) };
  }
  if (toDue === 0) return { headline: `Hoy es el último día para ${task}`, detail: null };
  return { headline: `${toDue === 1 ? 'Queda 1 día' : `Quedan ${toDue} días`} para ${task}`, detail: `Hasta el ${due}` };
});
</script>

<template>
  <div role="status" :class="cn('flex flex-wrap items-center gap-x-3 gap-y-1 border-y px-4 py-2.5 text-sm sm:px-6', overdue ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-notice-border bg-notice text-notice-foreground')">
    <CalendarClock :class="cn('size-4 shrink-0', overdue ? 'text-destructive' : 'text-warning')" aria-hidden="true" />
    <span class="font-medium">{{ notice.headline }}</span>
    <span v-if="notice.detail" :class="overdue ? '' : 'text-notice-foreground/80'">{{ notice.detail }}</span>
  </div>
</template>
