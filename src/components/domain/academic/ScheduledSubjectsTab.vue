<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type ScheduledSubjects, type TeacherAssignments } from "@/api/career-academics";
import ParallelCreationSheet from "@/components/domain/academic/ParallelCreationSheet.vue";
import { activateRow } from "@/lib/rowActivation";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
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
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const canPlan = (item: ScheduledRow): boolean => !props.data.career.lock_reason && item.editable;
const planningId = ref<string | null>(null);
const planningOpen = ref(false);
const planning = computed(() => props.data.scheduledSubjects.find((item) => item.subject_id === planningId.value) ?? null);
const openPlanning = (item: ScheduledRow): void => { planningId.value = item.subject_id; planningOpen.value = true; };
const selected = ref<string[]>([]);
const selectableItems = computed(() => filter.items.value.filter(canPlan));
const selectedRows = computed(() => props.data.scheduledSubjects.filter((item) => selected.value.includes(item.subject_id)));
const allSelected = computed<boolean | "indeterminate">(() => {
  const count = selectableItems.value.filter((item) => selected.value.includes(item.subject_id)).length;
  return count === 0 ? false : count === selectableItems.value.length ? true : "indeterminate";
});
const toggleItem = (item: ScheduledRow, checked: boolean | "indeterminate"): void => {
  selected.value = checked === true ? [...new Set([...selected.value, item.subject_id])] : selected.value.filter((id) => id !== item.subject_id);
};
const toggleAll = (checked: boolean | "indeterminate"): void => {
  const ids = selectableItems.value.map((item) => item.subject_id);
  selected.value = checked === true ? [...new Set([...selected.value, ...ids])] : selected.value.filter((id) => !ids.includes(id));
};
watch(() => props.data.scheduledSubjects, (rows) => { selected.value = selected.value.filter((id) => rows.some((item) => item.subject_id === id)); });
const emptyMessage = computed(() => filter.active.value ? "No hay materias que coincidan con los filtros." : "No hay materias en la malla.");
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
      <ParallelBulkActions
        v-if="selectedRows.length"
        :items="selectedRows"
        :shift-options="data.options.shiftOptions"
        :teacher-users="teacherUsers"
        :assignments="assignments"
        @changed="emit('changed', $event)"
        @failed="emit('failed', $event)"
        @clear="selected = []"
      />
      <Table label="Materias programadas">
        <TableHeader><TableRow><TableHead class="w-10"><Checkbox v-if="selectableItems.length" :model-value="allSelected" aria-label="Seleccionar las materias visibles" @update:model-value="toggleAll" /></TableHead><TableHead>Materia</TableHead><TableHead class="text-center">Ciclo</TableHead><TableHead class="text-center">Paralelos</TableHead><TableHead class="text-center">Jornada</TableHead><TableHead>Docente</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="6">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.subject_id" :class="canPlan(item) ? 'cursor-pointer' : ''" :tabindex="canPlan(item) ? 0 : undefined" :aria-label="canPlan(item) ? `Paralelos y docentes de ${item.label}` : undefined" @click="canPlan(item) && activateRow($event, () => openPlanning(item))" @keydown.enter.self.prevent="canPlan(item) && openPlanning(item)" @keydown.space.self.prevent="canPlan(item) && openPlanning(item)">
            <TableCell><Checkbox v-if="canPlan(item)" :model-value="selected.includes(item.subject_id)" :aria-label="`Seleccionar ${item.label}`" @update:model-value="toggleItem(item, $event)" /></TableCell>
            <TableCell>{{ item.subject_name }}</TableCell>
            <TableCell class="text-center">{{ item.subject_cycle === null ? "Sin ciclo" : item.subject_cycle }}</TableCell>
            <TableCell class="text-center"><ul v-if="item.parallels.length" class="-mx-2 flex flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-7 items-center justify-center border-border px-2 not-first:border-t">{{ parallel.code }}</li></ul><span v-else class="text-muted-foreground">Sin paralelos</span></TableCell>
            <TableCell class="text-center"><ul v-if="item.parallels.length" class="-mx-2 flex flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-7 items-center justify-center border-border px-2 not-first:border-t">{{ shiftLabel(parallel.shift, data.options.shiftOptions) }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
            <TableCell><ul v-if="item.parallels.length" class="-mx-2 flex flex-col"><li v-for="parallel in item.parallels" :key="parallel.id" class="flex h-7 items-center border-border px-2 not-first:border-t" :class="teacherByParallel.get(parallel.id) ? '' : 'text-muted-foreground'">{{ teacherByParallel.get(parallel.id) ?? 'Sin docente' }}</li></ul><span v-else class="text-muted-foreground">—</span></TableCell>
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
    </CardContent>
  </Card>
</template>
