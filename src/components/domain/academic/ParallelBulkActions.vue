<script setup lang="ts">
import { ChevronDown, Plus, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCareerRecord, createParallels, deleteCareerRecord, updateParallel, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import { Button } from '@/components/ui/button';
import TeacherSelect from '@/components/domain/academic/TeacherSelect.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const run = async (steps: Array<() => Promise<unknown>>, done: string, nothing: string): Promise<void> => {
  if (steps.length === 0) {
    emit('changed', nothing);
    return;
  }
  busy.value = true;
  let failures = 0;
  let firstError = '';
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
  await run(
    props.items.map((item) => () => createParallels({ subject_id: item.subject_id, codes: [nextParallelCode(item.parallels)], shift, user_id: userId })),
    `Paralelo agregado a ${props.items.length} ${props.items.length === 1 ? 'materia' : 'materias'}`,
    'No hay materias seleccionadas',
  );
};
const setShift = (shift: string) => run(
  props.items.flatMap((item) => chosen(item)
    .filter((parallel) => parallel.editable !== false && parallel.shift !== shift)
    .map((parallel) => () => updateParallel(parallel.id, { code: parallel.code, shift }))),
  'Jornada actualizada en los paralelos seleccionados',
  'Los paralelos seleccionados ya tenían esa jornada',
);
const setTeacher = (userId: string) => run(
  props.items.flatMap((item) => chosen(item)
    .filter((parallel) => assignmentOf(parallel.id)?.editable !== false && (assignmentOf(parallel.id)?.user_id ?? NO_TEACHER) !== userId)
    .map((parallel) => async () => {
      const current = assignmentOf(parallel.id);
      if (current) await deleteCareerRecord('asignacion_docente', current.id);
      if (userId !== NO_TEACHER) await createCareerRecord('asignacion_docente', { user_id: userId, parallel_id: parallel.id });
    })),
  userId === NO_TEACHER ? 'Docente retirado de los paralelos seleccionados' : 'Docente asignado a los paralelos seleccionados',
  'Los paralelos seleccionados ya tenían ese docente',
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-md ring-1 ring-surface-ring bg-muted/40 px-3 py-2" role="region" aria-label="Acciones masivas de materias">
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
      <DialogContent :aria-describedby="undefined">
        <DialogHeader><DialogTitle>Agregar un paralelo a las materias seleccionadas</DialogTitle></DialogHeader>
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
            <Button type="submit" :disabled="busy"><Plus data-icon="inline-start" aria-hidden="true" />Agregar paralelos</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
