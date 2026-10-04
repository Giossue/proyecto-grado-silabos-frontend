<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Lock, Pause, Play } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { transitionConvocation, type ConvocationItem } from '@/api/convocations';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';

type Transition = 'pausar' | 'reanudar';
const props = defineProps<{ convocation: ConvocationItem }>();
const emit = defineEmits<{ changed: [message: string] }>();
const pending = ref<Transition | null>(null);
const processing = ref(false);
const error = ref<string | null>(null);
const openingOpen = ref(false);
const dialogs: Record<Transition, { title: string; description: string; label: string }> = {
  pausar: { title: 'Pausar la convocatoria', description: 'Los docentes de su carrera no podrán editar ni enviar hasta que la reanude; sus borradores se conservan. Durante la pausa puede corregir la malla y los datos curriculares; la revisión de lo enviado continúa.', label: 'Pausar' },
  reanudar: { title: 'Reanudar la convocatoria', description: 'Los docentes vuelven a trabajar, los paralelos creados durante la pausa reciben su sílabo y la malla y los datos curriculares de la carrera quedan protegidos de nuevo.', label: 'Reanudar' },
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
    if (!props.convocation.id) return;
    const result = await transitionConvocation(props.convocation.id, pending.value);
    pending.value = null;
    emit('changed', result.message);
  } catch (failure) {
    error.value = failure instanceof ApiError ? failure.message : 'No se pudo cambiar la convocatoria.';
  } finally { processing.value = false; }
};
const opened = (message: string): void => emit('changed', message);
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${convocation.name}`">
    <DropdownMenuItem v-if="convocation.id === null" :disabled="convocation.process_state !== 'abierto'" @select="openingOpen = true"><Play aria-hidden="true" />Abrir convocatoria</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'abierta'" @select="select('pausar')"><Pause aria-hidden="true" />Pausar</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'pausada'" :disabled="convocation.process_state !== 'abierto'" @select="select('reanudar')"><Play aria-hidden="true" />Reanudar</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'cerrada'" disabled><Lock aria-hidden="true" />Convocatoria cerrada</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.process_state !== 'abierto'" disabled><Lock aria-hidden="true" />{{ convocation.process_state === 'pausado' ? 'Convocatoria institucional pausada' : convocation.process_state === 'cerrado' ? 'Convocatoria institucional finalizada' : 'Pendiente de apertura institucional' }}</DropdownMenuItem>
  </TableActionsMenu>
  <ConvocationOpeningDialog
    v-if="convocation.id === null"
    v-model:open="openingOpen"
    :process-id="convocation.process_id"
    :period="convocation.period"
    @opened="opened"
  />
  <Dialog :open="pending !== null" @update:open="(open) => { if (!open && !processing) pending = null; }"><DialogContent v-if="pending"><DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit">
    <FeedbackAlert v-if="error" :message="error" />
    <DialogFooter><DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose><Button type="button" :disabled="processing" @click="submit"><Spinner v-if="processing" data-icon="inline-start" /><Pause v-else-if="pending === 'pausar'" data-icon="inline-start" aria-hidden="true" /><Play v-else data-icon="inline-start" aria-hidden="true" />{{ dialogs[pending].label }}</Button></DialogFooter>
  </form></DialogContent></Dialog>
</template>
