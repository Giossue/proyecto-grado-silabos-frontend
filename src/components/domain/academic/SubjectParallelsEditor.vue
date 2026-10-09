<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { Plus, Trash2 } from '@lucide/vue';
import { computed, reactive, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCareerRecord, createParallels, deleteCareerRecord, deleteParallel, updateParallel, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { nextParallelCode } from '@/lib/parallelCodes';

type Parallel = ScheduledSubjects['scheduledSubjects'][number]['parallels'][number];

const NO_TEACHER = 'none';
const props = defineProps<{
  subjectId: string;
  subjectName: string;
  periodId: string;
  parallels: Parallel[];
  shiftOptions: ScheduledSubjects['options']['shiftOptions'];
  teacherUsers: TeacherAssignments['options']['teacherUsers'];
  assignments: TeacherAssignments['teacherAssignments'];
  editable: boolean;
}>();
const emit = defineEmits<{ changed: [message: string]; failed: [message: string] }>();

const busy = ref(false);
const drafts = reactive<Record<string, string>>({});
const defaultShift = computed(() => props.shiftOptions[0]?.value ?? '');
const assignmentOf = (parallelId: string) => props.assignments.find((item) => item.parallel_id === parallelId && item.active) ?? null;
const teacherOf = (parallelId: string) => assignmentOf(parallelId)?.user_id ?? NO_TEACHER;
const teacherChoices = (parallelId: string) => {
  const current = assignmentOf(parallelId);
  return current && !props.teacherUsers.some((user) => user.id === current.user_id)
    ? [{ id: current.user_id, name: current.user_name, email: '' }, ...props.teacherUsers]
    : props.teacherUsers;
};
const canEditParallel = (parallel: Parallel): boolean => props.editable && !busy.value && parallel.editable !== false;
const canEditTeacher = (parallel: Parallel): boolean => props.editable && !busy.value && assignmentOf(parallel.id)?.editable !== false;
const canDelete = (parallel: Parallel): boolean => props.editable && !busy.value && parallel.deletable !== false;

const run = async (action: () => Promise<{ message: string }>, fallback: string): Promise<boolean> => {
  busy.value = true;
  try {
    emit('changed', (await action()).message);
    return true;
  } catch (reason) {
    emit('failed', reason instanceof ApiError ? reason.message : fallback);
    return false;
  } finally {
    busy.value = false;
  }
};
const add = () => run(
  () => createParallels({ subject_id: props.subjectId, period_id: props.periodId, codes: [nextParallelCode(props.parallels)], shift: defaultShift.value }),
  'No se pudo crear el paralelo.',
);
const commitCode = async (parallel: Parallel) => {
  const value = (drafts[parallel.id] ?? parallel.code).trim();
  delete drafts[parallel.id];
  if (!value || value === parallel.code) return;
  await run(() => updateParallel(parallel.id, { code: value, shift: parallel.shift || defaultShift.value }), 'No se pudo actualizar el paralelo.');
};
const changeShift = (parallel: Parallel, shift: string) => shift && shift !== parallel.shift
  ? run(() => updateParallel(parallel.id, { code: parallel.code, shift }), 'No se pudo actualizar la jornada.')
  : undefined;
const changeTeacher = (parallel: Parallel, userId: string) => {
  if (userId === teacherOf(parallel.id)) return undefined;
  return run(async () => {
    const current = assignmentOf(parallel.id);
    let result: { message: string } = { message: 'Docente retirado del paralelo.' };
    if (current) result = await deleteCareerRecord('asignacion_docente', current.id);
    if (userId !== NO_TEACHER) result = await createCareerRecord('asignacion_docente', { user_id: userId, parallel_id: parallel.id });
    return result;
  }, 'No se pudo cambiar el docente.');
};
const remove = (parallel: Parallel) => run(() => deleteParallel(parallel.id), 'No se pudo eliminar el paralelo.');
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="!parallels.length && !editable" class="text-muted-foreground">Sin paralelos</span>
    <div v-for="parallel in parallels" :key="parallel.id" class="flex flex-wrap items-center gap-2">
      <Input
        class="w-16"
        :model-value="drafts[parallel.id] ?? parallel.code"
        :maxlength="VALIDATION_LIMITS.parallelCode"
        :disabled="!canEditParallel(parallel)"
        :aria-label="`Código del paralelo ${parallel.code} de ${subjectName}`"
        @update:model-value="drafts[parallel.id] = String($event)"
        @blur="commitCode(parallel)"
        @keydown.enter.prevent="commitCode(parallel)"
      />
      <Select :model-value="parallel.shift ?? ''" :disabled="!canEditParallel(parallel)" @update:model-value="changeShift(parallel, String($event))">
        <SelectTrigger class="w-36" :aria-label="`Jornada del paralelo ${parallel.code} de ${subjectName}`"><SelectValue placeholder="Elija jornada" /></SelectTrigger>
        <SelectContent><SelectGroup>
          <SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
        </SelectGroup></SelectContent>
      </Select>
      <Select :model-value="teacherOf(parallel.id)" :disabled="!canEditTeacher(parallel)" @update:model-value="changeTeacher(parallel, String($event))">
        <SelectTrigger class="min-w-44 max-w-64 flex-1" :aria-label="`Docente del paralelo ${parallel.code} de ${subjectName}`"><SelectValue placeholder="Sin docente" /></SelectTrigger>
        <SelectContent><SelectGroup>
          <SelectItem :value="NO_TEACHER">Sin docente</SelectItem>
          <SelectItem v-for="teacher in teacherChoices(parallel.id)" :key="teacher.id" :value="teacher.id">{{ teacher.name }}</SelectItem>
        </SelectGroup></SelectContent>
      </Select>
      <Button v-if="editable" type="button" size="icon-sm" variant="ghost" :disabled="!canDelete(parallel)" :aria-label="`Quitar paralelo ${parallel.code} de ${subjectName}`" @click="remove(parallel)"><Trash2 aria-hidden="true" /></Button>
    </div>
    <Tooltip v-if="editable">
      <TooltipTrigger as-child>
        <Button type="button" size="icon-sm" variant="outline" class="w-fit" :disabled="busy" :aria-label="`Agregar paralelo a ${subjectName}`" @click="add"><Plus aria-hidden="true" /></Button>
      </TooltipTrigger>
      <TooltipContent>Agregar paralelo</TooltipContent>
    </Tooltip>
  </div>
</template>
