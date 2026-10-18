<script setup lang="ts">
import { ChevronDown, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCareerRecord, createParallels, deleteCareerRecord, updateParallel, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import { Button } from '@/components/ui/button';
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
  shiftOptions: ScheduledSubjects['options']['shiftOptions'];
  teacherUsers: TeacherAssignments['options']['teacherUsers'];
  assignments: TeacherAssignments['teacherAssignments'];
}>();
const emit = defineEmits<{ changed: [message: string]; failed: [message: string]; clear: [] }>();

const NO_TEACHER = 'none';
const busy = ref(false);
const label = computed(() => `${props.items.length} ${props.items.length === 1 ? 'materia seleccionada' : 'materias seleccionadas'}`);
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
      firstError ||= reason instanceof ApiError ? reason.message : 'No se pudo completar el cambio.';
    }
  }
  busy.value = false;
  if (failures === 0) {
    emit('changed', done);
  } else {
    emit('failed', `${steps.length - failures} de ${steps.length} cambios aplicados. ${firstError}`);
    emit('changed', 'Se aplicaron los cambios posibles.');
  }
  emit('clear');
};

const addParallel = (shift: string) => run(
  props.items.map((item) => () => createParallels({ subject_id: item.subject_id, codes: [nextParallelCode(item.parallels)], shift })),
  `Paralelo agregado a ${props.items.length} ${props.items.length === 1 ? 'materia' : 'materias'}.`,
  'No hay materias seleccionadas.',
);
const setShift = (shift: string) => run(
  props.items.flatMap((item) => item.parallels
    .filter((parallel) => parallel.editable !== false && parallel.shift !== shift)
    .map((parallel) => () => updateParallel(parallel.id, { code: parallel.code, shift }))),
  'Jornada actualizada en los paralelos seleccionados.',
  'Los paralelos seleccionados ya tenían esa jornada.',
);
const setTeacher = (userId: string) => run(
  props.items.flatMap((item) => item.parallels
    .filter((parallel) => assignmentOf(parallel.id)?.editable !== false && (assignmentOf(parallel.id)?.user_id ?? NO_TEACHER) !== userId)
    .map((parallel) => async () => {
      const current = assignmentOf(parallel.id);
      if (current) await deleteCareerRecord('asignacion_docente', current.id);
      if (userId !== NO_TEACHER) await createCareerRecord('asignacion_docente', { user_id: userId, parallel_id: parallel.id });
    })),
  userId === NO_TEACHER ? 'Docente retirado de los paralelos seleccionados.' : 'Docente asignado a los paralelos seleccionados.',
  'Los paralelos seleccionados ya tenían ese docente.',
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Agregar un paralelo</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem v-for="option in shiftOptions" :key="option.value" @select="addParallel(option.value)">{{ option.label }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Asignar jornada</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem v-for="option in shiftOptions" :key="option.value" @select="setShift(option.value)">{{ option.label }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Asignar docente</DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="max-h-72 overflow-y-auto">
            <DropdownMenuItem @select="setTeacher(NO_TEACHER)">Sin docente</DropdownMenuItem>
            <DropdownMenuItem v-for="teacher in teacherUsers" :key="teacher.id" @select="setTeacher(teacher.id)">{{ teacher.name }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button type="button" size="sm" variant="ghost" :disabled="busy" @click="emit('clear')"><X data-icon="inline-start" aria-hidden="true" />Quitar selección</Button>
  </div>
</template>
