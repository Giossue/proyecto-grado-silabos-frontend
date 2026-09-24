<script setup lang="ts">
import { CalendarCheck, ListChecks, Trash2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { preparePeriod, type ScheduledSubjects, type TeacherAssignments } from '@/api/career-academics';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { preparationRows, type PreparationRow } from '@/lib/periodPreparation';
import { PARALLEL_SHIFTS } from '@/lib/parallelShifts';

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
const formatter = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const planningPeriods = computed(() => props.options.periods.filter((period) => period.planning_enabled));
const parallelCount = computed(() => rows.value.reduce((total, row) => total + row.parallels.length, 0));
const assignedCount = computed(() => rows.value.reduce((total, row) => total + row.parallels.filter((parallel) => parallel.teacherId).length, 0));
const invalidRows = computed(() => rows.value.some((row) =>
  row.parallels.length === 0 || row.parallels.some((parallel) => !parallel.code.trim())
  || new Set(row.parallels.map((parallel) => parallel.code.trim())).size !== row.parallels.length,
));
const dateRange = (period: ScheduledSubjects['options']['periods'][number]) =>
  `${period.code} · ${formatter.format(new Date(`${period.starts_on}T00:00:00Z`))} – ${formatter.format(new Date(`${period.ends_on}T00:00:00Z`))}`;

const updateProposal = () => {
  const proposal = preparationRows(periodId.value, props.options, props.scheduledSubjects, props.assignments, props.teacherUsers);
  rows.value = proposal.rows;
  sourcePeriodCode.value = proposal.sourcePeriodCode;
  error.value = null;
};
const reset = () => {
  periodId.value = planningPeriods.value.some((item) => item.id === props.initialPeriodId)
    ? props.initialPeriodId ?? ''
    : planningPeriods.value[0]?.id ?? '';
  updateProposal();
};
const addParallel = (row: PreparationRow) => row.parallels.push({ code: '', shift: '', teacherId: '' });
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
          shift: parallel.shift || null,
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
  <FormSheet
    v-model:open="open"
    :disabled="props.disabled"
    wide
    trigger-label="Preparar período"
    title="Preparar período académico"
    description="La malla activa se incluirá completa. Revise los paralelos y docentes propuestos antes de guardar."
  >
    <template #trigger>
      <Button :disabled="props.disabled"><CalendarCheck data-icon="inline-start" aria-hidden="true" />Preparar período</Button>
    </template>
    <template #default="{ close }">
      <form class="contents" @submit.prevent="submit(close)">
        <FieldGroup>
          <Field>
            <FieldLabel for="period-preparation-period" required>Período académico</FieldLabel>
            <Select v-model="periodId" required>
              <SelectTrigger id="period-preparation-period"><SelectValue placeholder="Seleccione un período" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem v-for="item in planningPeriods" :key="item.id" :value="item.id">{{ dateRange(item) }}</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </Field>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <Alert v-if="!periodId"><AlertDescription>Seleccione un período para ver las materias pendientes.</AlertDescription></Alert>
          <template v-else>
            <p v-if="rows.length" class="text-sm text-muted-foreground">
              {{ rows.length }} materias pendientes · {{ parallelCount }} paralelos · {{ assignedCount }} docentes propuestos.
              <span v-if="sourcePeriodCode"> Basado en {{ sourcePeriodCode }}; puede cambiar cualquier propuesta.</span>
              <span v-else> Sin programación anterior; complete los datos que correspondan.</span>
            </p>
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Materia</TableHead><TableHead>Paralelos, jornada y docente</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableEmpty v-if="!rows.length" :colspan="3">Todas las materias activas ya están programadas en este período. Agregue paralelos desde las acciones de cada materia.</TableEmpty>
                <TableRow v-for="row in rows" v-else :key="row.id">
                  <TableCell class="align-top">{{ row.code }}</TableCell>
                  <TableCell class="align-top">{{ row.name }}</TableCell>
                  <TableCell><div class="flex flex-col gap-2">
                    <div v-for="(parallel, index) in row.parallels" :key="index" class="flex flex-wrap items-center gap-2">
                      <Input v-model="parallel.code" class="w-20" :aria-label="`Código del paralelo ${index + 1} de ${row.name}`" :placeholder="index ? 'Ej. B' : 'Ej. A'" />
                      <Select :model-value="parallel.shift || 'sin_jornada'" @update:model-value="parallel.shift = String($event) === 'sin_jornada' ? '' : String($event)">
                        <SelectTrigger class="w-40" :aria-label="`Jornada del paralelo ${index + 1} de ${row.name}`"><SelectValue placeholder="Sin jornada" /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem value="sin_jornada">Sin jornada</SelectItem>
                          <SelectItem v-for="option in PARALLEL_SHIFTS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
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
                  </div></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Alert v-if="invalidRows" variant="destructive"><AlertDescription>Cada materia debe tener paralelos con códigos distintos.</AlertDescription></Alert>
            <p v-if="rows.length && assignedCount < parallelCount" class="text-sm text-muted-foreground">Los paralelos sin docente se guardarán pendientes de asignación.</p>
          </template>
          <FormSheetActions :close="close" :processing="saving" :disabled="!periodId || !rows.length || invalidRows" :icon="ListChecks" label="Confirmar preparación" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
