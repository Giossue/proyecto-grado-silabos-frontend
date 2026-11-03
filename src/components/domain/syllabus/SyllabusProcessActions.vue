<script setup lang="ts">
import { CalendarClock, Lock, Pause, Play, Trash2 } from '@lucide/vue';
import { computed, ref, watch, type Component } from 'vue';
import { ApiError } from '@/api/client';
import { deleteProcess, getProcessImpact, transitionProcess, type ProcessImpact, type SyllabusProcess, type SyllabusStateCounts } from '@/api/processes';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';
import SyllabusStateCountsTable from '@/components/domain/syllabus/SyllabusStateCountsTable.vue';
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { matchesPhrase } from '@/lib/confirmPhrase';

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
const deleteErrors = ref<Record<string, string[]>>({});
const deleteMessage = ref('');
const impact = ref<ProcessImpact | null>(null);
const impactLoading = ref(false);
const impactError = ref<string | null>(null);

const dialogs: Record<Transition, { title: string; description: string; label: string; icon: Component; destructive?: boolean }> = {
  pausar: {
    title: 'Pausar la convocatoria',
    description: 'Se detienen los envíos y la edición docente en todas las carreras hasta que la reanude',
    label: 'Pausar',
    icon: Pause,
  },
  reanudar: {
    title: 'Reanudar la convocatoria',
    description: 'Los envíos vuelven a admitirse y la plantilla vuelve a quedar protegida',
    label: 'Reanudar',
    icon: Play,
  },
  cerrar: {
    title: 'Finalizar la convocatoria',
    description: 'Los sílabos del período quedan guardados solo para consulta: ya no se editan, envían, revisan ni firman, y un cambio de docente no los borra. Esta acción no se deshace',
    label: 'Finalizar',
    icon: Lock,
    destructive: true,
  },
};

const typed = ref('');
const phrase = computed((): string | null => {
  if (pending.value === 'cerrar') return 'finalizar convocatoria';
  if (pending.value === 'reanudar' && templateImpact.value) return 'rehacer sílabos';
  return null;
});
const phraseReady = computed(() => phrase.value === null || matchesPhrase(typed.value, phrase.value));
const transitionReady = computed(() => phraseReady.value && (pending.value !== 'cerrar' || impact.value !== null));
const unapproved = computed((): SyllabusStateCounts => Object.fromEntries(
  Object.entries(impact.value?.syllabi ?? {}).filter(([state, count]) => state !== 'aprobado' && count > 0),
));
const unapprovedTotal = computed(() => Object.values(unapproved.value).reduce((sum, count) => sum + count, 0));
watch(phrase, () => { typed.value = ''; });
const DELETE_PHRASE = 'eliminar convocatoria';
const deleteTyped = ref('');
const deleteReady = computed(() => !deleting.value
  && impact.value !== null
  && deleteMessage.value.trim() !== ''
  && matchesPhrase(deleteTyped.value, DELETE_PHRASE));

const loadImpact = async (failure: string): Promise<void> => {
  impact.value = null;
  impactLoading.value = true;
  impactError.value = null;
  try {
    impact.value = await getProcessImpact(props.process.id);
  } catch {
    impactError.value = failure;
  } finally {
    impactLoading.value = false;
  }
};

watch(deleteOpen, (open) => {
  deleteTyped.value = '';
  deleteMessage.value = '';
  deleteErrors.value = {};
  impact.value = null;
  if (open) void loadImpact('No se pudo saber cuántos sílabos se borran. Inténtelo de nuevo');
});

watch(pending, (value) => {
  if (value === 'cerrar') void loadImpact('No se pudo saber cuántos sílabos quedan sin aprobar. Inténtelo de nuevo');
});

const confirm = async (): Promise<void> => {
  if (!pending.value || !transitionReady.value) return;
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
    error.value = cause instanceof ApiError ? cause.message : 'No se pudo cambiar el estado del proceso';
  } finally {
    processing.value = false;
  }
};

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
  if (!deleteReady.value) return;
  deleting.value = true;
  deleteError.value = null;
  deleteErrors.value = {};
  try {
    const response = await deleteProcess(props.process.id, { mensaje: deleteMessage.value.trim() });
    deleteOpen.value = false;
    emit('completed', response.message);
  } catch (cause) {
    if (cause instanceof ApiError && cause.errors.mensaje) {
      deleteErrors.value = cause.errors;
      return;
    }
    deleteError.value = cause instanceof ApiError
      ? (cause.errors.process?.[0] ?? cause.message)
      : 'No se pudo eliminar la convocatoria institucional';
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
    <DropdownMenuItem v-if="process.state === 'abierto' || process.state === 'pausado'" variant="destructive" @select="pending = 'cerrar'"><Lock />Finalizar</DropdownMenuItem>
    <DropdownMenuItem v-if="process.deletable && process.state !== 'cerrado'" variant="destructive" @select="openDelete"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
  </TableActionsMenu>

  <Dialog :open="pending !== null" @update:open="(value) => { if (!value) { pending = null; templateImpact = null; error = null; } }">
    <DialogContent v-if="pending">
      <DialogHeader><DialogTitle>{{ dialogs[pending].title }}</DialogTitle><DialogDescription>{{ dialogs[pending].description }}</DialogDescription></DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="confirm">
        <template v-if="templateImpact">
          <p>El administrador cambió la plantilla durante la pausa. Al reanudar se rehacen desde cero todos los sílabos de este período y se elimina su historial</p>
          <SyllabusStateCountsTable :counts="templateImpact" caption="Cantidad de sílabos que se rehacen, por estado" />
        </template>
        <template v-if="pending === 'cerrar'">
          <Skeleton v-if="impactLoading" class="h-24 w-full" />
          <Alert v-else-if="impactError" variant="destructive"><AlertDescription>{{ impactError }}</AlertDescription></Alert>
          <template v-else-if="impact">
            <p v-if="impact.total === 0">La convocatoria no tiene sílabos</p>
            <p v-else-if="unapprovedTotal === 0">Todos los sílabos están aprobados</p>
            <template v-else>
              <p>Lo que no esté aprobado quedará solo para consulta</p>
              <SyllabusStateCountsTable :counts="unapproved" :total="unapprovedTotal" caption="Sílabos sin aprobar, por estado" />
            </template>
          </template>
        </template>
        <ConfirmPhrase v-if="phrase" id="process-transition-confirm" v-model="typed" :phrase="phrase" />
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" :variant="templateImpact || dialogs[pending].destructive ? 'destructive' : 'default'" :disabled="processing || !transitionReady"><Spinner v-if="processing" data-icon="inline-start" /><component :is="dialogs[pending].icon" v-else data-icon="inline-start" aria-hidden="true" />{{ templateImpact ? 'Reanudar y rehacer sílabos' : dialogs[pending].label }}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  <Dialog v-model:open="deleteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Eliminar convocatoria institucional</DialogTitle>
        <DialogDescription>Se borran la convocatoria, las de cada carrera y todos sus sílabos, incluso los enviados y aprobados. El período queda libre para abrir otra convocatoria. Esta acción no se puede deshacer</DialogDescription>
      </DialogHeader>
      <Skeleton v-if="impactLoading" class="h-36 w-full" />
      <Alert v-else-if="impactError" variant="destructive"><AlertDescription>{{ impactError }}</AlertDescription></Alert>
      <SyllabusStateCountsTable v-else-if="impact" :counts="impact.syllabi" :total="impact.total" caption="Sílabos que se borran, por estado" />
      <Field :data-invalid="Boolean(deleteErrors.mensaje)">
        <FieldLabel for="process-delete-message" required>Mensaje para docentes, coordinación y biblioteca</FieldLabel>
        <Textarea id="process-delete-message" v-model="deleteMessage" rows="3" maxlength="1000" aria-required="true" :aria-invalid="Boolean(deleteErrors.mensaje)" />
        <FieldDescription>Les llega como aviso y por correo</FieldDescription>
        <FieldError :errors="deleteErrors.mensaje" />
      </Field>
      <ConfirmPhrase id="process-delete-confirm" v-model="deleteTyped" :phrase="DELETE_PHRASE" />
      <Alert v-if="deleteError" variant="destructive"><AlertDescription>{{ deleteError }}</AlertDescription></Alert>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
        <Button type="button" variant="destructive" :disabled="!deleteReady" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar convocatoria</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <DeadlineExtensionSheet v-model:open="deadlineOpen" :process-id="process.id" display="menu" @saved="emit('completed', $event)" />
</template>
