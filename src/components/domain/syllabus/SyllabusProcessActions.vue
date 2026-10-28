<script setup lang="ts">
import { CalendarClock, Lock, Pause, Play, Trash2 } from '@lucide/vue';
import { ref, type Component } from 'vue';
import { ApiError } from '@/api/client';
import { deleteProcess, transitionProcess, type SyllabusProcess, type SyllabusStateCounts } from '@/api/processes';
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

const props = withDefaults(defineProps<{ process: SyllabusProcess; menu?: boolean }>(), { menu: true });
const emit = defineEmits<{
  completed: [message: string];
}>();

const pending = ref<Transition | null>(null);
const processing = ref(false);
const error = ref<string | null>(null);
const templateImpact = ref<SyllabusStateCounts | null>(null);
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
    title: 'Cerrar la convocatoria',
    description: 'Los sílabos del período quedan guardados solo para consulta: ya no se editan, envían ni revisan, y un cambio de docente no los borra. Esta acción no se deshace.',
    label: 'Cerrar',
    icon: Lock,
    destructive: true,
  },
};

const confirm = async (): Promise<void> => {
  if (!pending.value) return;
  processing.value = true;
  error.value = null;
  try {
    const response = await transitionProcess(
      props.process.id,
      pending.value,
      templateImpact.value ? { confirmar_rehacer: true } : undefined,
    );
    pending.value = null;
    templateImpact.value = null;
    emit('completed', response.message);
  } catch (cause) {
    if (cause instanceof ApiError && cause.payload.code === 'plantilla_cambiada' && pending.value === 'reanudar') {
      const counts = cause.payload.counts;
      if (counts && typeof counts === 'object') {
        templateImpact.value = counts as SyllabusStateCounts;
      }
      return;
    }
    error.value = cause instanceof ApiError ? cause.message : 'No se pudo cambiar el estado del proceso.';
  } finally {
    processing.value = false;
  }
};

const stateLabel = (state: string): string => ({
  sin_iniciar: 'Sin iniciar',
  borrador: 'Borrador',
  en_revision: 'En revisión',
  correccion_solicitada: 'Corrección solicitada',
  aprobado: 'Aprobado',
}[state] ?? state);

const openDelete = (event: Event): void => {
  event.preventDefault();
  deleteError.value = null;
  deleteOpen.value = true;
};

const run = (key: 'pausar' | 'reanudar' | 'cerrar' | 'prorrogar' | 'eliminar'): void => {
  if (key === 'prorrogar') deadlineOpen.value = true;
  else if (key === 'eliminar') { deleteError.value = null; deleteOpen.value = true; }
  else pending.value = key;
};
defineExpose({ run });

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
  <TableActionsMenu v-if="menu" :label="`Acciones para ${process.name}`">
    <slot />
    <DropdownMenuItem v-if="process.state === 'abierto'" @select="pending = 'pausar'"><Pause />Pausar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'pausado'" @select="pending = 'reanudar'"><Play />Reanudar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.state === 'abierto' || process.state === 'pausado'" @select="deadlineOpen = true"><CalendarClock />Prorrogar plazo</DropdownMenuItem>
    <DropdownMenuSeparator v-if="process.state !== 'cerrado'" />
    <DropdownMenuItem v-if="process.state === 'abierto' || process.state === 'pausado'" variant="destructive" @select="pending = 'cerrar'"><Lock />Cerrar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.deletable && process.state !== 'cerrado'" variant="destructive" @select="openDelete"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
    <DropdownMenuItem v-else-if="process.state !== 'cerrado'" disabled><Lock aria-hidden="true" />No se puede eliminar: ya hay sílabos enviados</DropdownMenuItem>
  </TableActionsMenu>

  <Dialog :open="pending !== null" @update:open="(value) => { if (!value) { pending = null; templateImpact = null; error = null; } }">
    <DialogContent v-if="pending">
      <DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="confirm">
        <template v-if="templateImpact">
          <p>El administrador cambió la plantilla durante la pausa. Al reanudar se rehacen desde cero todos los sílabos de este período y se elimina su historial.</p>
          <table class="w-full text-sm">
            <caption class="sr-only">Cantidad de sílabos que se rehacen, por estado</caption>
            <tbody>
              <tr v-for="(count, state) in templateImpact" :key="state">
                <th scope="row" class="py-1 text-left font-medium">{{ stateLabel(state) }}</th>
                <td class="py-1 text-right tabular-nums">{{ count }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" :variant="templateImpact || dialogs[pending].destructive ? 'destructive' : 'default'" :disabled="processing"><Spinner v-if="processing" data-icon="inline-start" /><component :is="dialogs[pending].icon" v-else data-icon="inline-start" aria-hidden="true" />{{ templateImpact ? 'Reanudar y rehacer sílabos' : dialogs[pending].label }}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  <Dialog v-model:open="deleteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Eliminar convocatoria institucional</DialogTitle>
        <DialogDescription>La convocatoria se borra de verdad, con las de cada carrera y los sílabos que estén en borrador. Solo se permite si ningún docente ha enviado su sílabo: si ya hay sílabos enviados, ciérrala para conservarla como historial. El período queda libre para abrir otra convocatoria. Esta acción no se puede deshacer.</DialogDescription>
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
