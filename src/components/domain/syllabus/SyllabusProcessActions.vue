<script setup lang="ts">
import { CalendarClock, Lock, Pause, Pencil, Play, Square } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { transitionProcess, type SyllabusProcess } from '@/api/processes';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Transition = 'abrir' | 'pausar' | 'reanudar' | 'cerrar';

const props = defineProps<{ process: SyllabusProcess; template: string | null; periods: { id: string; codigo: string }[] }>();
const emit = defineEmits<{
  completed: [message: string];
}>();

const pending = ref<Transition | null>(null);
const reason = ref('');
const processing = ref(false);
const error = ref<string | null>(null);
const editOpen = ref(false);
const deadlineOpen = ref(false);
const reasonCharacters = computed(() => reason.value.trim().length);

const dialogs: Record<Transition, { title: string; description: string; label: string; destructive?: boolean }> = {
  abrir: {
    title: 'Abrir el proceso',
    description: 'Las coordinaciones podrán abrir sus convocatorias y los docentes empezarán a elaborar. Mientras esté abierto, la plantilla no se puede modificar.',
    label: 'Abrir proceso',
  },
  pausar: {
    title: 'Pausar el proceso',
    description: 'Se detienen los envíos y la edición docente en todas las carreras hasta que lo reanude. El motivo queda en auditoría.',
    label: 'Pausar proceso',
  },
  reanudar: {
    title: 'Reanudar el proceso',
    description: 'Los envíos vuelven a admitirse y la plantilla vuelve a quedar protegida.',
    label: 'Reanudar proceso',
  },
  cerrar: {
    title: 'Cerrar el proceso',
    description: 'Ningún sílabo de este proceso podrá enviarse después. Esta acción no se deshace.',
    label: 'Cerrar proceso',
    destructive: true,
  },
};

const confirm = async (): Promise<void> => {
  if (!pending.value) return;
  if (pending.value === 'pausar' && reason.value.trim().length < 10) {
    error.value = 'Escriba al menos 10 caracteres para explicar la pausa.';
    return;
  }
  processing.value = true;
  error.value = null;
  try {
    const response = await transitionProcess(
      props.process.id,
      pending.value,
      pending.value === 'pausar' ? reason.value.trim() : undefined,
    );
    pending.value = null;
    reason.value = '';
    emit('completed', response.message);
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'No se pudo cambiar el estado del proceso.';
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${process.name}`">
    <DropdownMenuItem v-if="process.configurable" @select="editOpen = true"><Pencil />Editar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'preparacion'" @select="pending = 'abrir'"><Play />Abrir</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'abierto'" @select="pending = 'pausar'"><Pause />Pausar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'pausado'" @select="pending = 'reanudar'"><Play />Reanudar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'abierto' || process.state === 'pausado'" @select="deadlineOpen = true"><CalendarClock />Prorrogar plazo</DropdownMenuItem>
    <template v-if="process.state === 'abierto' || process.state === 'pausado'">
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="pending = 'cerrar'"><Square />Cerrar</DropdownMenuItem>
    </template>
    <DropdownMenuItem v-if="process.state === 'cerrado'" disabled><Lock />Proceso cerrado</DropdownMenuItem>
  </TableActionsMenu>

  <Dialog :open="pending !== null" @update:open="(value) => { if (!value) pending = null; }">
    <DialogContent v-if="pending">
      <DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="confirm">
        <Field v-if="pending === 'pausar'"><FieldLabel for="process-pause-reason" required>Motivo</FieldLabel><Textarea id="process-pause-reason" v-model="reason" rows="3" required minlength="10" placeholder="Corrección de la sección de evaluación en la plantilla." /><p class="text-sm text-muted-foreground" :class="{ 'text-destructive': reasonCharacters < 10 }">{{ reasonCharacters }}/10 caracteres mínimos</p></Field>
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" :variant="dialogs[pending].destructive ? 'destructive' : 'default'" :disabled="processing || (pending === 'pausar' && reasonCharacters < 10)"><Spinner v-if="processing" />{{ dialogs[pending].label }}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  <SyllabusProcessSheet v-model:open="editOpen" :template="template" :periods="periods" :process="process" display="menu" @saved="emit('completed', $event)" />
  <DeadlineExtensionSheet v-model:open="deadlineOpen" :process-id="process.id" display="menu" @saved="emit('completed', $event)" />
</template>
