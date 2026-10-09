<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type ScheduledSubjects, type TeacherAssignments } from "@/api/career-academics";
import SubjectParallelsEditor from "@/components/domain/academic/SubjectParallelsEditor.vue";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientFilter } from "@/composables/useClientFilter";
import { useClientPagination } from "@/composables/useClientPagination";

const props = defineProps<{ data: ScheduledSubjects; assignments: TeacherAssignments["teacherAssignments"]; teacherUsers: TeacherAssignments["options"]["teacherUsers"] }>();
const emit = defineEmits<{ period: [id: string]; changed: [message: string]; failed: [message: string] }>();
const selectedPeriod = ref(props.data.selectedPeriodId ?? "");

type ScheduledRow = ScheduledSubjects["scheduledSubjects"][number];
const selectedPeriodOption = computed(() => props.data.options.periods.find((item) => item.id === selectedPeriod.value));
const periodRows = computed<ScheduledRow[]>(() => {
  const scheduled = new Map(props.data.scheduledSubjects.filter((item) => item.period_id === selectedPeriod.value).map((item) => [item.subject_id, item]));
  const period = selectedPeriodOption.value;
  const fromCurriculum = props.data.options.activeSubjects.map((subject): ScheduledRow => scheduled.get(subject.id) ?? {
    subject_id: subject.id,
    period_id: selectedPeriod.value,
    label: subject.nombre,
    subject_code: subject.codigo_asignatura,
    subject_name: subject.nombre,
    subject_cycle: subject.ciclo,
    period_starts_on: period?.starts_on ?? "",
    period_ends_on: period?.ends_on ?? "",
    period_status: period?.status ?? "proximo",
    period_status_label: period?.status_label ?? "",
    period_planning_enabled: period?.planning_enabled ?? false,
    campus_name: null,
    modality_name: null,
    parallels: [],
    editable: true,
  });
  const known = new Set(fromCurriculum.map((item) => item.subject_id));
  return [...fromCurriculum, ...[...scheduled.values()].filter((item) => !known.has(item.subject_id))]
    .sort((left, right) => (left.subject_cycle ?? Number.MAX_SAFE_INTEGER) - (right.subject_cycle ?? Number.MAX_SAFE_INTEGER) || left.subject_name.localeCompare(right.subject_name, "es"));
});
const cycleKey = (item: ScheduledRow) => item.subject_cycle === null ? "none" : String(item.subject_cycle);
const shiftKey = (shift: string | null | undefined) => shift ?? "none";
const filter = useClientFilter(periodRows, (item) => [item.subject_name], {
  ciclo: { matches: (item, value) => cycleKey(item) === value },
  paralelo: { matches: (item, value) => item.parallels.some((parallel) => parallel.code === value) },
  jornada: { matches: (item, value) => item.parallels.some((parallel) => shiftKey(parallel.shift) === value) },
});
const cycleOptions = computed(() => [...new Map(periodRows.value.map((item) => [
  cycleKey(item),
  { value: cycleKey(item), label: item.subject_cycle === null ? "Sin ciclo" : String(item.subject_cycle), order: item.subject_cycle ?? Number.MAX_SAFE_INTEGER },
])).values()].sort((a, b) => a.order - b.order));
const parallelOptions = computed(() => [...new Set(periodRows.value.flatMap((item) => item.parallels.map((parallel) => parallel.code)))]
  .sort((a, b) => a.localeCompare(b, "es", { numeric: true })));
const shiftOptions = computed(() => [...new Map(periodRows.value.flatMap((item) => item.parallels).map((parallel) => [
  shiftKey(parallel.shift),
  { value: shiftKey(parallel.shift), label: (props.data.options.shiftOptions.find((option) => option.value === parallel.shift)?.label ?? "Sin jornada") },
])).values()].sort((a, b) => a.label.localeCompare(b.label, "es")));
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const canPlan = (item: ScheduledRow): boolean => !props.data.career.lock_reason && item.period_planning_enabled;
const emptyMessage = computed(() => filter.active.value ? "No hay materias que coincidan con los filtros." : "No hay materias para este período.");
watch(() => props.data.selectedPeriodId, (value) => { selectedPeriod.value = value ?? ""; });
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4">
      <ClientFilterBar :filter="filter" input-id="scheduled-subjects-search" label="Buscar materia programada" placeholder="Buscar por materia">
        <template #filters>
          <Field><FieldLabel for="scheduled-subject-cycle" class="sr-only">Ciclo</FieldLabel>
            <Select v-model="filter.values.ciclo.value" @update:model-value="setPage(1)">
              <SelectTrigger id="scheduled-subject-cycle"><SelectValue placeholder="Todos los ciclos" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todos los ciclos</SelectItem><SelectItem v-for="option in cycleOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel for="scheduled-subject-parallel" class="sr-only">Paralelo</FieldLabel>
            <Select v-model="filter.values.paralelo.value" @update:model-value="setPage(1)">
              <SelectTrigger id="scheduled-subject-parallel"><SelectValue placeholder="Todos los paralelos" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todos los paralelos</SelectItem><SelectItem v-for="code in parallelOptions" :key="code" :value="code">{{ code }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel for="scheduled-subject-shift" class="sr-only">Jornada</FieldLabel>
            <Select v-model="filter.values.jornada.value" @update:model-value="setPage(1)">
              <SelectTrigger id="scheduled-subject-shift"><SelectValue placeholder="Todas las jornadas" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todas las jornadas</SelectItem><SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </template>
      </ClientFilterBar>
      <Alert v-if="selectedPeriodOption?.planning_enabled === false"><AlertDescription>Período finalizado · solo lectura</AlertDescription></Alert>
      <Table label="Materias programadas">
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead class="text-center">Ciclo</TableHead><TableHead>Paralelos y docentes</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="3">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.subject_id">
            <TableCell class="align-top">{{ item.subject_name }}</TableCell>
            <TableCell class="text-center align-top">{{ item.subject_cycle === null ? "Sin ciclo" : item.subject_cycle }}</TableCell>
            <TableCell>
              <SubjectParallelsEditor
                :subject-id="item.subject_id"
                :subject-name="item.subject_name"
                :period-id="item.period_id"
                :parallels="item.parallels"
                :shift-options="data.options.shiftOptions"
                :teacher-users="teacherUsers"
                :assignments="assignments"
                :editable="canPlan(item)"
                @changed="emit('changed', $event)"
                @failed="emit('failed', $event)"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias programadas" @update:page="setPage" />
    </CardContent>
  </Card>
</template>
