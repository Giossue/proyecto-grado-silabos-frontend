<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Pause, Play } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { transitionConvocation } from '@/api/convocations';
import type { CoordinationConvocation } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { withoutFinalPeriod } from '@/lib/utils';
import { afterDialogExit, useShownWhileClosing } from '@/lib/dialogExit';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';

type Transition = 'pausar' | 'reanudar';
const props = defineProps<{ convocation: CoordinationConvocation; blockedReason?: string }>();
const emit = defineEmits<{ changed: [message: string] }>();
const pending = ref<Transition | null>(null);
// Lo que muestra el modal: no cambia mientras se desvanece al cerrar.
const shownPending = useShownWhileClosing(() => pending.value);
const processing = ref(false);
const error = ref<string | null>(null);
const openingOpen = ref(false);
const dialogs: Record<Transition, { title: string; description: string; label: string }> = {
  pausar: { title: 'Pausar la convocatoria', description: 'Hasta que la reanude, los docentes de su carrera no podrán editar ni enviar, y Coordinación y Biblioteca no podrán revisar sus sílabos. Los borradores se conservan. Durante la pausa puede corregir la malla y los datos curriculares', label: 'Pausar' },
  reanudar: { title: 'Reanudar la convocatoria', description: 'Los docentes vuelven a trabajar, los paralelos creados durante la pausa reciben su sílabo y la malla y los datos curriculares de la carrera quedan protegidos de nuevo', label: 'Reanudar' },
};
const select = (value: Transition): void => {
  pending.value = value;
  error.value = null;
};
const submit = async (): Promise<void> => {
  if (!pending.value) return;
  processing.value = true;
  error.value = null;
  try {
    if (!props.convocation.convocation_id) return;
    const result = await transitionConvocation(props.convocation.convocation_id, pending.value);
    pending.value = null;
    emit('changed', result.message);
  } catch (failure) {
    error.value = failure instanceof ApiError ? failure.message : 'No se pudo cambiar la convocatoria';
  } finally { processing.value = false; }
};
// Al refrescar, la convocatoria ya existe y el modal de apertura se quita: se avisa cuando ya se cerró.
const opened = async (message: string): Promise<void> => {
  await afterDialogExit();
  emit('changed', message);
};
</script>

<template>
  <Tooltip v-if="convocation.convocation_id === null && !convocation.can_open && blockedReason"><TooltipTrigger as-child><span class="inline-flex" tabindex="0"><Button type="button" disabled><Play data-icon="inline-start" aria-hidden="true" />Abrir convocatoria</Button></span></TooltipTrigger><TooltipContent>{{ withoutFinalPeriod(blockedReason) }}</TooltipContent></Tooltip>
  <Button v-else-if="convocation.convocation_id === null" type="button" :disabled="!convocation.can_open" @click="openingOpen = true"><Play data-icon="inline-start" aria-hidden="true" />Abrir convocatoria</Button>
  <Button v-else-if="convocation.state === 'abierta'" type="button" @click="select('pausar')"><Pause data-icon="inline-start" aria-hidden="true" />Pausar convocatoria</Button>
  <Button v-else-if="convocation.state === 'pausada'" type="button" :disabled="!convocation.process_open" @click="select('reanudar')"><Play data-icon="inline-start" aria-hidden="true" />Reanudar convocatoria</Button>
  <ConvocationOpeningDialog
    v-if="convocation.convocation_id === null"
    v-model:open="openingOpen"
    :process-id="convocation.process_id"
    :period="convocation.period"
    @opened="opened"
  />
  <Dialog :open="pending !== null" @update:open="(open) => { if (!open && !processing) pending = null; }"><DialogContent><template v-if="shownPending"><DialogHeader><DialogTitle>{{ dialogs[shownPending].title }}</DialogTitle><DialogDescription>{{ dialogs[shownPending].description }}</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit">
    <FeedbackAlert v-if="error" :message="error" />
    <DialogFooter><DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose><Button type="button" :disabled="processing" @click="submit"><Spinner v-if="processing" data-icon="inline-start" /><Pause v-else-if="shownPending === 'pausar'" data-icon="inline-start" aria-hidden="true" /><Play v-else data-icon="inline-start" aria-hidden="true" />{{ dialogs[shownPending].label }}</Button></DialogFooter>
  </form></template></DialogContent></Dialog>
</template>
