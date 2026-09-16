<script setup lang="ts">
import { Eye, Lock, Pause, Play } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { createConvocation, openConvocation, transitionConvocation, type ConvocationItem } from '@/api/convocations';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Transition = 'iniciar' | 'abrir' | 'pausar' | 'reanudar';
const props = defineProps<{ convocation: ConvocationItem; availableSources: Array<{ id: string; name: string }> }>();
const emit = defineEmits<{ changed: [message: string]; navigate: [id: string] }>();
const pending = ref<Transition | null>(null);
const processing = ref(false);
const reason = ref('');
const sourceIds = ref<string[]>([]);
const error = ref<string | null>(null);
const fieldErrors = ref<Record<string, string[]>>({});
const dialogs: Record<Transition, { title: string; description: string; label: string }> = {
  iniciar: { title: 'Iniciar convocatoria de la carrera', description: 'Se comprobarán la malla, las materias programadas, la asignación docente y las fuentes académicas de su carrera. Se generará un sílabo por paralelo usando la plantilla y las fechas institucionales. Si falta algún requisito, no se iniciará la convocatoria.', label: 'Iniciar convocatoria' },
  abrir: { title: 'Abrir la convocatoria', description: 'Se fijan la plantilla del proceso y las fuentes, se valida que cada paralelo tenga docente vigente y se generan todos los expedientes en una sola transacción. Si algo falta, no se crea ninguno.', label: 'Abrir y generar expedientes' },
  pausar: { title: 'Pausar la convocatoria', description: 'Los docentes de su carrera no podrán editar ni enviar hasta que la reanude; sus borradores se conservan. La malla y las fuentes quedan editables. El motivo queda en auditoría.', label: 'Pausar' },
  reanudar: { title: 'Reanudar la convocatoria', description: 'Los docentes vuelven a trabajar y la malla y las fuentes de la carrera quedan protegidas de nuevo.', label: 'Reanudar' },
};
const select = (value: Transition): void => {
  pending.value = value;
  reason.value = '';
  sourceIds.value = [];
  error.value = null;
  fieldErrors.value = {};
};
const toggleSource = (id: string, checked: boolean | 'indeterminate'): void => {
  sourceIds.value = checked === true ? [...new Set([...sourceIds.value, id])] : sourceIds.value.filter((value) => value !== id);
};
const submit = async (): Promise<void> => {
  if (!pending.value) return;
  processing.value = true;
  error.value = null;
  fieldErrors.value = {};
  try {
    if (pending.value === 'iniciar') {
      const result = await createConvocation(props.convocation.process_id, sourceIds.value);
      pending.value = null;
      emit('navigate', result.convocation_id);
      return;
    }
    if (!props.convocation.id) return;
    const result = pending.value === 'abrir'
      ? await openConvocation(props.convocation.id)
      : await transitionConvocation(props.convocation.id, pending.value, pending.value === 'pausar' ? reason.value : undefined);
    pending.value = null;
    emit('changed', result.message);
  } catch (failure) {
    if (failure instanceof ApiError) {
      error.value = failure.message;
      fieldErrors.value = failure.errors;
    } else error.value = 'No se pudo cambiar la convocatoria.';
  } finally { processing.value = false; }
};
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${convocation.name}`">
    <DropdownMenuItem v-if="convocation.id === null" :disabled="convocation.process_state !== 'abierto'" @select="select('iniciar')"><Play aria-hidden="true" />Iniciar</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.id !== null" as-child><RouterLink :to="`/coordinacion/convocatorias/${convocation.id}`"><Eye aria-hidden="true" />Ver seguimiento</RouterLink></DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'preparacion'" :disabled="convocation.process_state !== 'abierto'" @select="select('abrir')"><Play aria-hidden="true" />Abrir convocatoria</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'abierta'" @select="select('pausar')"><Pause aria-hidden="true" />Pausar</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'pausada'" :disabled="convocation.process_state !== 'abierto'" @select="select('reanudar')"><Play aria-hidden="true" />Reanudar</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.state === 'cerrada'" disabled><Lock aria-hidden="true" />Convocatoria cerrada</DropdownMenuItem>
    <DropdownMenuItem v-if="convocation.process_state !== 'abierto'" disabled><Lock aria-hidden="true" />{{ convocation.process_state === 'pausado' ? 'Proceso institucional en pausa' : convocation.process_state === 'cerrado' ? 'Proceso institucional cerrado' : 'Pendiente de apertura institucional' }}</DropdownMenuItem>
  </TableActionsMenu>
  <Dialog :open="pending !== null" @update:open="(open) => { if (!open && !processing) pending = null; }"><DialogContent v-if="pending"><DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit">
    <fieldset v-if="pending === 'iniciar'" class="flex flex-col gap-3"><legend class="text-sm font-medium">Fuentes académicas</legend><Field v-for="source in availableSources" :key="source.id" orientation="horizontal"><Checkbox :id="`source-${convocation.process_id}-${source.id}`" :model-value="sourceIds.includes(source.id)" @update:model-value="toggleSource(source.id, $event)" /><FieldLabel :for="`source-${convocation.process_id}-${source.id}`">{{ source.name }}</FieldLabel></Field><p v-if="availableSources.length === 0" class="text-sm text-muted-foreground">Cree al menos una fuente activa antes de iniciar.</p><FieldError :errors="fieldErrors.source_ids" /></fieldset>
    <Field v-if="pending === 'pausar'" :data-invalid="Boolean(fieldErrors.reason)"><FieldLabel :for="`convocation-pause-reason-${convocation.id}`" required>Motivo</FieldLabel><Textarea :id="`convocation-pause-reason-${convocation.id}`" v-model="reason" rows="3" :aria-invalid="Boolean(fieldErrors.reason)" placeholder="Corrección de las horas de dos materias de la malla antes de continuar." required /><FieldError :errors="fieldErrors.reason" /></Field>
    <p v-if="error && Object.keys(fieldErrors).length === 0" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <DialogFooter><DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose><Button type="button" :disabled="processing || (pending === 'iniciar' && sourceIds.length === 0)" @click="submit"><Spinner v-if="processing" data-icon="inline-start" /><Pause v-else-if="pending === 'pausar'" data-icon="inline-start" aria-hidden="true" /><Play v-else data-icon="inline-start" aria-hidden="true" />{{ dialogs[pending].label }}</Button></DialogFooter>
  </form></DialogContent></Dialog>
</template>
