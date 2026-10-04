<script setup lang="ts">
import { CalendarClock, Pause, Play, Square, Trash2 } from '@lucide/vue';
import { ref, type Component } from 'vue';
import { ApiError } from '@/api/client';
import { deleteProcess, transitionProcess, type SyllabusProcess } from '@/api/processes';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';
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
import { Spinner } from '@/components/ui/spinner';

type Transition = 'pausar' | 'reanudar' | 'cerrar';

const props = defineProps<{ process: SyllabusProcess }>();
const emit = defineEmits<{
  completed: [message: string];
}>();

const pending = ref<Transition | null>(null);
const processing = ref(false);
const error = ref<string | null>(null);
const deadlineOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const dialogs: Record<Transition, { title: string; description: string; label: string; icon: Component; destructive?: boolean }> = {
  pausar: {
    title: 'Pausar la convocatoria',
    description: 'Se detienen los envíos y la edición docente en todas las carreras hasta que la reanude.',
    label: 'Pausar',
    icon: Pause,
  },
  reanudar: {
    title: 'Reanudar la convocatoria',
    description: 'Los envíos vuelven a admitirse y la plantilla vuelve a quedar protegida.',
    label: 'Reanudar',
    icon: Play,
  },
  cerrar: {
    title: 'Finalizar la convocatoria',
    description: 'Ningún sílabo de esta convocatoria podrá enviarse después. Esta acción no se deshace.',
    label: 'Finalizar',
    icon: Square,
    destructive: true,
  },
};

const confirm = async (): Promise<void> => {
  if (!pending.value) return;
  processing.value = true;
  error.value = null;
  try {
    const response = await transitionProcess(props.process.id, pending.value);
    pending.value = null;
    emit('completed', response.message);
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'No se pudo cambiar el estado del proceso.';
  } finally {
    processing.value = false;
  }
};

const openDelete = (event: Event): void => {
  event.preventDefault();
  deleteError.value = null;
  deleteOpen.value = true;
};

const remove = async (): Promise<void> => {
  deleting.value = true;
  deleteError.value = null;
  try {
    const response = await deleteProcess(props.process.id);
    deleteOpen.value = false;
    emit('completed', response.message);
  } catch (cause) {
    deleteError.value = cause instanceof ApiError
      ? (cause.errors.process?.[0] ?? cause.message)
      : 'No se pudo eliminar la convocatoria institucional.';
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${process.name}`">
    <slot />
    <DropdownMenuItem v-if="process.state === 'abierto'" @select="pending = 'pausar'"><Pause />Pausar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'pausado'" @select="pending = 'reanudar'"><Play />Reanudar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'abierto' || process.state === 'pausado'" @select="deadlineOpen = true"><CalendarClock />Prorrogar plazo</DropdownMenuItem>
    <template v-if="process.state === 'abierto' || process.state === 'pausado'">
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="pending = 'cerrar'"><Square />Finalizar</DropdownMenuItem>
    </template>
    <DropdownMenuSeparator v-if="process.state !== 'cerrado'" />
    <DropdownMenuItem variant="destructive" @select="openDelete"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
  </TableActionsMenu>

  <Dialog :open="pending !== null" @update:open="(value) => { if (!value) pending = null; }">
    <DialogContent v-if="pending">
      <DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="confirm">
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" :variant="dialogs[pending].destructive ? 'destructive' : 'default'" :disabled="processing"><Spinner v-if="processing" data-icon="inline-start" /><component :is="dialogs[pending].icon" v-else data-icon="inline-start" aria-hidden="true" />{{ dialogs[pending].label }}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  <Dialog v-model:open="deleteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Eliminar convocatoria institucional</DialogTitle>
        <DialogDescription>Se eliminarán esta convocatoria, sus alcances de carrera y todos sus sílabos, incluidos los iniciados, aprobados y firmados. Esta acción no se puede deshacer.</DialogDescription>
      </DialogHeader>
      <Alert v-if="deleteError" variant="destructive"><AlertDescription>{{ deleteError }}</AlertDescription></Alert>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
        <Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" /><Trash2 v-else aria-hidden="true" />Eliminar convocatoria</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <DeadlineExtensionSheet v-model:open="deadlineOpen" :process-id="process.id" display="menu" @saved="emit('completed', $event)" />
</template>
