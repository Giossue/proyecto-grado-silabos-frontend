<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type ScheduledSubjects, type TeacherAssignments } from "@/api/career-academics";
import ParallelCreationSheet from "@/components/domain/academic/ParallelCreationSheet.vue";
import { activateRow } from "@/lib/rowActivation";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import StatusBadge from "@/components/domain/StatusBadge.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import ParallelBulkActions from "@/components/domain/academic/ParallelBulkActions.vue";
import { Checkbox } from "@/components/ui/checkbox";
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
const emit = defineEmits<{ changed: [message: string]; failed: [message: string] }>();

const periodRows = computed(() => props.data.scheduledSubjects);
type ScheduledRow = ScheduledSubjects["scheduledSubjects"][number];
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
const teacherByParallel = computed(() => new Map(props.assignments.filter((item) => item.active).map((item) => [item.parallel_id, item.user_name])));
const shiftOptions = computed(() => [...new Map(periodRows.value.flatMap((item) => item.parallels).map((parallel) => [
  shiftKey(parallel.shift),
  { value: shiftKey(parallel.shift), label: shiftLabel(parallel.shift, props.data.options.shiftOptions) },
])).values()].sort((a, b) => a.label.localeCompare(b.label, "es")));
const { items, meta, setPage } = useClientPagination(() => filter.items.value, 20, filter.criteria);
const canPlan = (item: ScheduledRow): boolean => item.editable;
const planningId = ref<string | null>(null);
const planningOpen = ref(false);
const planning = computed(() => props.data.scheduledSubjects.find((item) => item.subject_id === planningId.value) ?? null);
const openPlanning = (item: ScheduledRow): void => { planningId.value = item.subject_id; planningOpen.value = true; };
const selectedParallels = ref<string[]>([]);
const selectedBare = ref<string[]>([]);
const selectableParallels = (item: ScheduledRow) => item.parallels.filter((parallel) => parallel.editable !== false);
const subjectState = (item: ScheduledRow): boolean | "indeterminate" => {
  const parallels = selectableParallels(item);
  if (parallels.length === 0) return selectedBare.value.includes(item.subject_id);
  const count = parallels.filter((parallel) => selectedParallels.value.includes(parallel.id)).length;
  return count === 0 ? false : count === parallels.length ? true : "indeterminate";
};
const selectableItems = computed(() => filter.items.value.filter(canPlan));
const selectedRows = computed(() => props.data.scheduledSubjects.filter((item) => subjectState(item) !== false));
const selectedParallelIds = computed(() => selectedParallels.value);
const allSelected = computed<boolean | "indeterminate">(() => {
  const states = selectableItems.value.map(subjectState);
  const full = states.filter((state) => state === true).length;
  const some = states.filter((state) => state !== false).length;
  return some === 0 ? false : full === selectableItems.value.length ? true : "indeterminate";
});
const setSubject = (item: ScheduledRow, checked: boolean): void => {
  const parallels = selectableParallels(item).map((parallel) => parallel.id);
  if (parallels.length === 0) {
    selectedBare.value = checked ? [...new Set([...selectedBare.value, item.subject_id])] : selectedBare.value.filter((id) => id !== item.subject_id);
    return;
  }
  selectedParallels.value = checked ? [...new Set([...selectedParallels.value, ...parallels])] : selectedParallels.value.filter((id) => !parallels.includes(id));
};
const toggleItem = (item: ScheduledRow, checked: boolean | "indeterminate"): void => setSubject(item, checked === true);
const toggleParallel = (id: string, checked: boolean | "indeterminate"): void => {
  selectedParallels.value = checked === true ? [...new Set([...selectedParallels.value, id])] : selectedParallels.value.filter((current) => current !== id);
};
const toggleAll = (checked: boolean | "indeterminate"): void => {
  for (const item of selectableItems.value) setSubject(item, checked === true);
};
const clearSelection = (): void => { selectedParallels.value = []; selectedBare.value = []; };
watch(() => props.data.scheduledSubjects, (rows) => {
  selectedParallels.value = selectedParallels.value.filter((id) => rows.some((item) => item.parallels.some((parallel) => parallel.id === id)));
  selectedBare.value = selectedBare.value.filter((id) => rows.some((item) => item.subject_id === id));
});
const emptyMessage = computed(() => filter.active.value ? "No hay materias que coincidan con los filtros" : "No hay materias en la malla");
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card class="py-3"><CardContent class="px-3">
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
    </CardContent></Card>
      <ParallelBulkActions
        v-if="selectedRows.length"
        :items="selectedRows"
        :parallel-ids="selectedParallelIds"
        :shift-options="data.options.shiftOptions"
        :teacher-users="teacherUsers"
        :assignments="assignments"
        @changed="emit('changed', $event)"
        @failed="emit('failed', $event)"
        @clear="clearSelection"
      />
      <Table label="Materias programadas">
        <TableHeader><TableRow><TableHead class="w-10"><Checkbox v-if="selectableItems.length" :model-value="allSelected" aria-label="Seleccionar las materias visibles" @update:model-value="toggleAll" /></TableHead><TableHead>Materia</TableHead><TableHead class="text-center">Ciclo</TableHead><TableHead class="text-center">Paralelos</TableHead><TableHead class="text-center">Jornada</TableHead><TableHead>Docente</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="6">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.subject_id" :class="canPlan(item) ? 'cursor-pointer' : ''" :tabindex="canPlan(item) ? 0 : undefined" :aria-label="canPlan(item) ? `Paralelos y docentes de ${item.label}` : undefined" @click="canPlan(item) && activateRow($event, () => openPlanning(item))" @keydown.enter.self.prevent="canPlan(item) && openPlanning(item)" @keydown.space.self.prevent="canPlan(item) && openPlanning(item)">
            <TableCell><Checkbox v-if="canPlan(item)" :model-value="subjectState(item)" :aria-label="`Seleccionar ${item.label}`" @update:model-value="toggleItem(item, $event)" /></TableCell>
            <TableCell><span class="flex flex-wrap items-center gap-2">{{ item.subject_name }}<StatusBadge v-if="item.generates_syllabus === false" label="Sin sílabo" tone="info" /></span></TableCell>
            <TableCell class="text-center">{{ item.subject_cycle === null ? "Sin ciclo" : item.subject_cycle }}</TableCell>
            <TableCell data-card-hide="true" class="py-0 text-center"><ul v-if="item.parallels.length" class="-mx-2 flex min-h-11 flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="relative flex min-h-9 flex-1 items-center justify-center border-border px-2 not-first:border-t"><Checkbox v-if="canPlan(item) && parallel.editable !== false" class="absolute left-[calc(50%-1.75rem)]" :model-value="selectedParallels.includes(parallel.id)" :aria-label="`Seleccionar el paralelo ${parallel.code} de ${item.label}`" @update:model-value="toggleParallel(parallel.id, $event)" />{{ parallel.code }}</li></ul><span v-else class="text-muted-foreground">Sin paralelos</span></TableCell>
            <TableCell data-card-hide="true" class="py-0 text-center"><ul v-if="item.parallels.length" class="-mx-2 flex min-h-11 flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex min-h-9 flex-1 items-center justify-center border-border px-2 not-first:border-t">{{ shiftLabel(parallel.shift, data.options.shiftOptions) }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
            <TableCell data-card-hide="true" class="py-0"><ul v-if="item.parallels.length" class="-mx-2 flex min-h-11 flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex min-h-9 flex-1 items-center border-border px-2 not-first:border-t" :class="teacherByParallel.get(parallel.id) ? '' : 'text-muted-foreground'">{{ teacherByParallel.get(parallel.id) ?? 'Sin docente' }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
            <TableCell class="sm:hidden" data-card-span="full">
              <p class="mb-1 text-xs font-medium text-muted-foreground">Paralelos</p>
              <ul v-if="item.parallels.length" class="flex flex-col divide-y divide-border rounded-md ring-1 ring-surface-ring">
                <li v-for="parallel in item.parallels" :key="parallel.id" class="flex flex-col gap-0.5 px-3 py-2">
                  <span class="flex items-center gap-2"><Checkbox v-if="canPlan(item) && parallel.editable !== false" :model-value="selectedParallels.includes(parallel.id)" :aria-label="`Seleccionar el paralelo ${parallel.code} de ${item.label}`" @update:model-value="toggleParallel(parallel.id, $event)" /><span class="font-semibold">Paralelo {{ parallel.code }}</span><span class="text-sm text-muted-foreground">{{ shiftLabel(parallel.shift, data.options.shiftOptions) }}</span></span>
                  <span class="text-sm" :class="teacherByParallel.get(parallel.id) ? '' : 'text-muted-foreground'">{{ teacherByParallel.get(parallel.id) ?? 'Sin docente' }}</span>
                </li>
              </ul>
              <span v-else class="text-sm text-muted-foreground">Sin paralelos</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias programadas" @update:page="setPage" />
      <ParallelCreationSheet
        v-if="planning"
        :key="`parallel-${planning.subject_id}`"
        v-model:open="planningOpen"
        :subject-id="planning.subject_id"
        :subject-label="planning.label"
        :parallels="planning.parallels"
        :shift-options="data.options.shiftOptions"
        :teacher-users="teacherUsers"
        :assignments="assignments"
        @saved="emit('changed', $event)"
        @changed="emit('changed', $event)"
      />
  </div>
</template>
