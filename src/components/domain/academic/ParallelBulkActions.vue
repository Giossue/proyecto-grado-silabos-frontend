<script setup lang="ts">
import { FINALIZED_NOTICE, requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';
import { deadlineState } from '@/state/deadline';
import { Card } from "@/components/ui/card";
import { ChevronDown, Plus, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCareerRecord, createParallels, deleteCareerRecord, replaceParallelTeacher, updateParallel, type PurgeHandling, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import { Button } from '@/components/ui/button';
import TeacherSelect from '@/components/domain/academic/TeacherSelect.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { afterDialogExit } from '@/lib/dialogExit';
import { nextParallelCode } from '@/lib/parallelCodes';

type Row = ScheduledSubjects['scheduledSubjects'][number];

const props = defineProps<{
  items: Row[];
  parallelIds: string[];
  shiftOptions: ScheduledSubjects['options']['shiftOptions'];
  teacherUsers: TeacherAssignments['options']['teacherUsers'];
  assignments: TeacherAssignments['teacherAssignments'];
}>();
const emit = defineEmits<{ changed: [message: string]; failed: [message: string]; clear: [] }>();

const NO_TEACHER = 'none';
const busy = ref(false);
const addOpen = ref(false);
const addShift = ref('');
const addTeacher = ref('');
const addError = ref<string | null>(null);
const label = computed(() => {
  const subjects = `${props.items.length} ${props.items.length === 1 ? 'materia' : 'materias'}`;
  const count = props.parallelIds.length;
  return count === 0 ? `${subjects} seleccionada${props.items.length === 1 ? '' : 's'}` : `${subjects} y ${count} ${count === 1 ? 'paralelo seleccionado' : 'paralelos seleccionados'}`;
});
const chosen = (item: Row) => item.parallels.filter((parallel) => props.parallelIds.includes(parallel.id));
const assignmentOf = (parallelId: string) => props.assignments.find((item) => item.parallel_id === parallelId && item.active) ?? null;

const run = async (steps: Array<() => Promise<unknown>>, done: string, nothing: string, closing?: Promise<void>): Promise<void> => {
  if (steps.length === 0) {
    emit('changed', nothing);
    return;
  }
  busy.value = true;
  let failures = 0;
  let firstError = '';
  // Ya se preguntó antes de empezar (confirmBatch): aquí ninguna petición vuelve a preguntar.
  for (const step of steps) {
    try {
      await step();
    } catch (reason) {
      failures++;
      firstError ||= reason instanceof ApiError ? reason.message : 'No se pudo completar el cambio';
    }
  }
  busy.value = false;
  if (failures === 0) {
    emit('changed', done);
  } else {
    emit('failed', `${steps.length - failures} de ${steps.length} cambios aplicados. ${firstError}`);
    emit('changed', 'Se aplicaron los cambios posibles');
  }
  // Quitar la selección retira esta barra: si se abrió desde el modal, se espera a que termine de cerrarse.
  await closing;
  emit('clear');
};

const openAdd = (): void => {
  addShift.value = props.shiftOptions[0]?.value ?? '';
  addTeacher.value = '';
  addError.value = null;
  addOpen.value = true;
};
const addParallel = async (): Promise<void> => {
  if (busy.value) return;
  if (!addShift.value || !addTeacher.value) {
    addError.value = 'Elija la jornada y el docente de los nuevos paralelos';
    return;
  }
  const shift = addShift.value;
  const userId = addTeacher.value;
  addOpen.value = false;
  const purge = await confirmBatch();
  if (purge === null) return;
  await run(
    props.items.map((item) => () => createParallels({ subject_id: item.subject_id, codes: [nextParallelCode(item.parallels)], shift, user_id: userId }, purge)),
    `Paralelo agregado a ${props.items.length} ${props.items.length === 1 ? 'materia' : 'materias'}`,
    'No hay materias seleccionadas',
    afterDialogExit(),
  );
};
// Un cambio masivo pregunta UNA sola vez y antes de tocar nada: «Cancelar» no cambia ningún paralelo.
// Pregunta si algún paralelo tiene el sílabo enviado o aprobado (se reinicia), o si la convocatoria ya finalizó (aviso).
const ask = (message: string, count: number, mode?: string): Promise<boolean> => new Promise((resolve) => {
  requestPurgeConfirmation(message, count, () => resolve(true), () => resolve(false), mode);
});
const finalized = computed(() => deadlineState.deadline.value?.state === 'closed');
const FINALIZED_MESSAGE = 'La convocatoria de su carrera ya finalizó. Estos cambios no afectan sus sílabos: conservan los datos que tenían. Se aplicarán en la próxima convocatoria, o en esta si la reabre con una prórroga. Si cancela, no se cambia nada.';
const confirmBatch = async (sentCount = 0): Promise<PurgeHandling | null> => {
  if (finalized.value) return await ask(FINALIZED_MESSAGE, 0, FINALIZED_NOTICE) ? 'confirmed' : null;
  if (sentCount === 0) return 'unconfirmed';
  const message = sentCount === 1
    ? 'El sílabo de 1 paralelo seleccionado ya está en revisión o aprobado. Cambiar la jornada lo elimina con todo su contenido (revisiones, aprobación, firmas y análisis de IA) y el docente lo empieza de nuevo. Si cancela, no se cambia ningún paralelo.'
    : `Los sílabos de ${sentCount} paralelos seleccionados ya están en revisión o aprobados. Cambiar la jornada los elimina con todo su contenido (revisiones, aprobación, firmas y análisis de IA) y los docentes los empiezan de nuevo. Si cancela, no se cambia ningún paralelo.`;

  return await ask(message, sentCount) ? 'confirmed' : null;
};
const setShift = async (shift: string): Promise<void> => {
  const targets = props.items.flatMap((item) => chosen(item).filter((parallel) => parallel.editable !== false && parallel.shift !== shift));
  if (targets.length === 0) {
    emit('changed', 'Los paralelos seleccionados ya tenían esa jornada');
    return;
  }
  const sent = targets.filter((parallel) => parallel.sent_syllabus);
  const purge = await confirmBatch(sent.length);
  if (purge === null) return;
  await run(
    // Solo los marcados como enviados se reinician; si otro se envió entretanto, esa petición falla y se informa.
    targets.map((parallel) => () => updateParallel(parallel.id, { code: parallel.code, shift }, purge === 'confirmed' && (finalized.value || parallel.sent_syllabus) ? 'confirmed' : 'unconfirmed')),
    'Jornada actualizada en los paralelos seleccionados',
    'Los paralelos seleccionados ya tenían esa jornada',
  );
};
const setTeacher = async (userId: string): Promise<void> => {
  const targets = props.items.flatMap((item) => chosen(item)
    .filter((parallel) => assignmentOf(parallel.id)?.editable !== false && (assignmentOf(parallel.id)?.user_id ?? NO_TEACHER) !== userId));
  if (targets.length === 0) {
    emit('changed', 'Los paralelos seleccionados ya tenían ese docente');
    return;
  }
  const purge = await confirmBatch();
  if (purge === null) return;
  await run(
    targets.map((parallel) => async () => {
      const current = assignmentOf(parallel.id);
      if (current && userId !== NO_TEACHER) await replaceParallelTeacher(parallel.id, userId, purge);
      else if (current) await deleteCareerRecord('asignacion_docente', current.id);
      else await createCareerRecord('asignacion_docente', { user_id: userId, parallel_id: parallel.id }, purge);
    }),
    userId === NO_TEACHER ? 'Docente retirado de los paralelos seleccionados' : 'Docente asignado a los paralelos seleccionados',
    'Los paralelos seleccionados ya tenían ese docente',
  );
};
</script>

<template>
  <Card class="flex-row flex-wrap items-center gap-2 px-3 py-2" role="region" aria-label="Acciones masivas de materias">
    <span class="text-sm font-medium">{{ label }}</span>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" size="sm" variant="outline" :disabled="busy">
          <Spinner v-if="busy" data-icon="inline-start" />
          Acciones masivas
          <ChevronDown data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem @select="openAdd">Agregar un paralelo</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger :disabled="parallelIds.length === 0">Asignar jornada</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem v-for="option in shiftOptions" :key="option.value" @select="setShift(option.value)">{{ option.label }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger :disabled="parallelIds.length === 0">Asignar docente</DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="max-h-72 overflow-y-auto">
            <DropdownMenuItem @select="setTeacher(NO_TEACHER)">Sin docente</DropdownMenuItem>
            <DropdownMenuItem v-for="teacher in teacherUsers" :key="teacher.id" @select="setTeacher(teacher.id)">{{ teacher.name }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button type="button" size="sm" variant="ghost" :disabled="busy" @click="emit('clear')"><X data-icon="inline-start" aria-hidden="true" />Quitar selección</Button>
    <Dialog v-model:open="addOpen">
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar un paralelo a las materias seleccionadas</DialogTitle><DialogDescription>Se crea el mismo paralelo en cada materia</DialogDescription></DialogHeader>
        <form class="contents" @submit.prevent="addParallel">
          <Alert v-if="addError" variant="destructive"><AlertDescription>{{ addError }}</AlertDescription></Alert>
          <FieldGroup>
            <Field :data-invalid="Boolean(addError) && !addShift">
              <FieldLabel for="bulk-parallel-shift" required>Jornada</FieldLabel>
              <Select v-model="addShift" required>
                <SelectTrigger id="bulk-parallel-shift" :aria-invalid="Boolean(addError) && !addShift"><SelectValue placeholder="Elija la jornada" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field :data-invalid="Boolean(addError) && !addTeacher">
              <FieldLabel for="bulk-parallel-teacher" required>Docente</FieldLabel>
              <TeacherSelect id="bulk-parallel-teacher" v-model="addTeacher" :teachers="teacherUsers" label="Docente de los nuevos paralelos" required :invalid="Boolean(addError) && !addTeacher" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" @click="addOpen = false">Cancelar</Button>
            <Button type="submit" :disabled="busy || !addShift || !addTeacher"><Plus data-icon="inline-start" aria-hidden="true" />Agregar paralelos</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </Card>
</template>
