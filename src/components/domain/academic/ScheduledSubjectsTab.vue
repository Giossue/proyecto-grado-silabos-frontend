<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type ScheduledSubjects, type TeacherAssignments } from "@/api/career-academics";
import ParallelCreationSheet from "@/components/domain/academic/ParallelCreationSheet.vue";
import { activateRow } from "@/lib/rowActivation";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { shiftLabel } from "@/lib/parallelShifts";

const props = defineProps<{ data: ScheduledSubjects; assignments: TeacherAssignments["teacherAssignments"]; teacherUsers: TeacherAssignments["options"]["teacherUsers"] }>();
const emit = defineEmits<{ period: [id: string]; changed: [message: string]; failed: [message: string] }>();
const selectedPeriod = ref(props.data.selectedPeriodId ?? "");

const periodRows = computed(() => props.data.scheduledSubjects.filter((item) => item.period_id === selectedPeriod.value));
type ScheduledRow = ScheduledSubjects["scheduledSubjects"][number];
const cycleKey = (item: ScheduledRow) => item.subject_cycle === null ? "none" : String(item.subject_cycle);
const shiftKey = (shift: string | null | undefined) => shift ?? "none";
const filter = useClientFilter(periodRows, (item) => [item.subject_name, item.subject_code], {
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
const teacherByParallel = computed(() => new Map(props.assignments.filter((item) => item.active).map((item) => [item.parallel_id, item.user_name])));
const shiftOptions = computed(() => [...new Map(periodRows.value.flatMap((item) => item.parallels).map((parallel) => [
  shiftKey(parallel.shift),
  { value: shiftKey(parallel.shift), label: shiftLabel(parallel.shift, props.data.options.shiftOptions) },
])).values()].sort((a, b) => a.label.localeCompare(b.label, "es")));
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const selectedPeriodOption = computed(() => props.data.options.periods.find((item) => item.id === selectedPeriod.value));
const canPlan = (item: ScheduledRow): boolean => !props.data.career.lock_reason && item.period_planning_enabled;
const planningId = ref<string | null>(null);
const planningOpen = ref(false);
const planning = computed(() => props.data.scheduledSubjects.find((item) => item.subject_id === planningId.value && item.period_id === selectedPeriod.value) ?? null);
const openPlanning = (item: ScheduledRow): void => { planningId.value = item.subject_id; planningOpen.value = true; };
const emptyMessage = computed(() => filter.active.value ? "No hay materias que coincidan con los filtros." : "No hay materias para este período.");
watch(() => props.data.selectedPeriodId, (value) => { selectedPeriod.value = value ?? ""; });
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4">
      <ClientFilterBar :filter="filter" input-id="scheduled-subjects-search" label="Buscar materia programada" placeholder="Buscar por materia o código">
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
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Ciclo</TableHead><TableHead>Paralelos</TableHead><TableHead>Jornada</TableHead><TableHead>Docente</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="5">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.subject_id" :class="canPlan(item) ? 'cursor-pointer' : ''" :tabindex="canPlan(item) ? 0 : undefined" :aria-label="canPlan(item) ? `Paralelos y docentes de ${item.label}` : undefined" @click="canPlan(item) && activateRow($event, () => openPlanning(item))" @keydown.enter.self.prevent="canPlan(item) && openPlanning(item)" @keydown.space.self.prevent="canPlan(item) && openPlanning(item)">
            <TableCell>{{ item.subject_name }}</TableCell>
            <TableCell>{{ item.subject_cycle === null ? "Sin ciclo" : `${item.subject_cycle}.º` }}</TableCell>
            <TableCell><ul v-if="item.parallels.length" class="flex flex-col gap-1"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-6 items-center"><Badge variant="outline">{{ parallel.code }}</Badge></li></ul><span v-else class="text-muted-foreground">Sin paralelos</span></TableCell>
            <TableCell><ul v-if="item.parallels.length" class="flex flex-col gap-1"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-6 items-center">{{ shiftLabel(parallel.shift, data.options.shiftOptions) }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
            <TableCell><ul v-if="item.parallels.length" class="flex flex-col gap-1"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-6 items-center" :class="teacherByParallel.get(parallel.id) ? '' : 'text-muted-foreground'">{{ teacherByParallel.get(parallel.id) ?? 'Sin docente' }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias programadas" @update:page="setPage" />
      <ParallelCreationSheet
        v-if="planning"
        :key="`parallel-${planning.subject_id}-${planning.period_id}`"
        v-model:open="planningOpen"
        :subject-id="planning.subject_id"
        :period-id="planning.period_id"
        :subject-label="planning.label"
        :parallels="planning.parallels"
        :shift-options="data.options.shiftOptions"
        :teacher-users="teacherUsers"
        :assignments="assignments"
        @saved="emit('changed', $event)"
        @changed="emit('changed', $event)"
      />
    </CardContent>
  </Card>
</template>
