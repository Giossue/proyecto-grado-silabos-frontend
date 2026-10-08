<script setup lang="ts">
import { CalendarCheck, ChevronDown, ListChecks, Trash2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { preparePeriod, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import FormDialog from '@/components/domain/FormDialog.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { groupByCycle, nextParallelCode, preparationProblem, preparationRows, type PreparationRow } from '@/lib/periodPreparation';

const props = defineProps<{
  scheduledSubjects: ScheduledSubjects['scheduledSubjects'];
  options: ScheduledSubjects['options'];
  assignments: TeacherAssignments['teacherAssignments'];
  teacherUsers: TeacherAssignments['options']['teacherUsers'];
  initialPeriodId?: string | null;
  disabled?: boolean;
}>();
const emit = defineEmits<{ saved: [message: string, periodId: string] }>();
const open = ref(false);
const periodId = ref('');
const rows = ref<PreparationRow[]>([]);
const sourcePeriodCode = ref<string | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);

const planningPeriods = computed(() => props.options.periods.filter((period) => period.planning_enabled));
const parallelCount = computed(() => rows.value.reduce((total, row) => total + row.parallels.length, 0));
const assignedCount = computed(() => rows.value.reduce((total, row) => total + row.parallels.filter((parallel) => parallel.teacherId).length, 0));
const problem = computed(() => preparationProblem(rows.value));
const cycles = computed(() => groupByCycle(rows.value));
const openCycles = ref<number[]>([]);
const toggleCycle = (cycle: number, value: boolean) => {
  openCycles.value = value ? [...openCycles.value, cycle] : openCycles.value.filter((item) => item !== cycle);
};
const invalidRows = computed(() => problem.value !== null);

const updateProposal = () => {
  const proposal = preparationRows(periodId.value, props.options, props.scheduledSubjects, props.assignments, props.teacherUsers);
  rows.value = proposal.rows;
  sourcePeriodCode.value = proposal.sourcePeriodCode;
  openCycles.value = cycles.value.slice(0, 1).map((group) => group.cycle);
  error.value = null;
};
const reset = () => {
  periodId.value = planningPeriods.value.some((item) => item.id === props.initialPeriodId)
    ? props.initialPeriodId ?? ''
    : planningPeriods.value[0]?.id ?? '';
  updateProposal();
};
const addParallel = (row: PreparationRow) => row.parallels.push({ code: nextParallelCode(row.parallels), shift: props.options.shiftOptions[0]?.value ?? '', teacherId: '' });
const removeParallel = (row: PreparationRow, index: number) => row.parallels.length > 1 && row.parallels.splice(index, 1);
const submit = async (close: () => void) => {
  if (props.disabled || !periodId.value || !rows.value.length || invalidRows.value) return;
  saving.value = true;
  error.value = null;
  try {
    const savedPeriodId = periodId.value;
    const result = await preparePeriod({
      period_id: savedPeriodId,
      subjects: rows.value.map((row) => ({
        id: row.id,
        parallels: row.parallels.map((parallel) => ({
          code: parallel.code.trim(),
          shift: parallel.shift,
          teacher_user_id: parallel.teacherId || null,
        })),
      })),
    });
    emit('saved', result.message, savedPeriodId);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo preparar el período.';
  } finally {
    saving.value = false;
  }
};
watch(open, (value) => value && reset());
watch(periodId, () => { if (open.value) updateProposal(); });
</script>

<template>
  <FormDialog
    v-model:open="open"
    :disabled="props.disabled"
    trigger-label="Asignar materias"
    title="Preparar período académico"
    description="Revise los paralelos y docentes propuestos."
  >
    <template #trigger>
      <Button :disabled="props.disabled"><CalendarCheck data-icon="inline-start" aria-hidden="true" />Asignar materias</Button>
    </template>
    <template #default="{ close }">
      <form class="contents" @submit.prevent="submit(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <Alert v-if="!periodId"><AlertDescription>No hay un período disponible para preparar.</AlertDescription></Alert>
          <template v-else>
            <p v-if="!rows.length" class="text-sm text-muted-foreground">Todas las materias activas ya están programadas en este período. Agregue paralelos desde las acciones de cada materia.</p>
            <div v-else class="flex flex-col gap-2">
              <Collapsible v-for="group in cycles" :key="group.cycle" class="rounded-md border" :open="openCycles.includes(group.cycle)" @update:open="toggleCycle(group.cycle, $event)">
                <CollapsibleTrigger class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                  <span>Ciclo {{ group.cycle }} <span class="font-normal text-muted-foreground">· {{ group.rows.length }} {{ group.rows.length === 1 ? 'materia' : 'materias' }}</span></span>
                  <ChevronDown class="size-4 transition-transform" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent class="divide-y border-t">
                  <div v-for="row in group.rows" :key="row.id" class="grid gap-2 px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <span class="text-sm">{{ row.name }}</span>
                    <div class="flex flex-col gap-2">
                    <div v-for="(parallel, index) in row.parallels" :key="index" class="flex flex-wrap items-center gap-2">
                      <Input v-model="parallel.code" class="w-14" :aria-label="`Código del paralelo ${index + 1} de ${row.name}`" :aria-invalid="!parallel.code.trim()" :placeholder="index ? 'Ej. B' : 'Ej. A'" />
                      <Select v-model="parallel.shift">
                        <SelectTrigger class="w-32" :aria-label="`Jornada del paralelo ${index + 1} de ${row.name}`" :aria-invalid="!parallel.shift"><SelectValue placeholder="Elija jornada" /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem v-for="option in options.shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                        </SelectGroup></SelectContent>
                      </Select>
                      <Select :model-value="parallel.teacherId || 'sin_docente'" @update:model-value="parallel.teacherId = String($event) === 'sin_docente' ? '' : String($event)">
                        <SelectTrigger class="min-w-44 max-w-60 flex-1" :aria-label="`Docente del paralelo ${parallel.code || index + 1} de ${row.name}`"><SelectValue placeholder="Sin docente" /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem value="sin_docente">Sin docente</SelectItem>
                          <SelectItem v-for="teacher in teacherUsers" :key="teacher.id" :value="teacher.id">{{ teacher.name }}</SelectItem>
                        </SelectGroup></SelectContent>
                      </Select>
                      <Button v-if="row.parallels.length > 1" type="button" size="icon-sm" variant="ghost" :aria-label="`Quitar paralelo ${parallel.code || index + 1}`" @click="removeParallel(row, index)"><Trash2 data-icon="inline-start" aria-hidden="true" /></Button>
                    </div>
                    <Button type="button" size="sm" variant="outline" class="w-fit" @click="addParallel(row)">Agregar paralelo</Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <Alert v-if="problem" variant="destructive"><AlertDescription>{{ problem }}</AlertDescription></Alert>
            <p v-if="rows.length && assignedCount < parallelCount" class="text-sm text-muted-foreground">Los paralelos sin docente se guardarán pendientes de asignación.</p>
          </template>
          <FormSheetActions :close="close" :processing="saving" :disabled="!periodId || !rows.length || invalidRows" :icon="ListChecks" label="Confirmar preparación" />
        </FieldGroup>
      </form>
    </template>
  </FormDialog>
</template>
