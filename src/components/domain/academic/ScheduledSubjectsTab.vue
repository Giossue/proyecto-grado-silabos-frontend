<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { type ScheduledSubjects } from "@/api/career-academics";
import CareerAcademicActions from "@/components/domain/academic/CareerAcademicActions.vue";
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

const props = defineProps<{ data: ScheduledSubjects }>();
const emit = defineEmits<{ period: [id: string]; changed: [message: string]; failed: [message: string] }>();
const selectedPeriod = ref(props.data.selectedPeriodId ?? "");
const formatter = new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const periodRows = computed(() => props.data.scheduledSubjects.filter((item) => item.period_id === selectedPeriod.value));
const filter = useClientFilter(periodRows, (item) => [
  item.subject_name,
  item.subject_code,
  item.subject_cycle?.toString(),
  ...item.parallels.flatMap((parallel) => [parallel.code, shiftLabel(parallel.shift)]),
]);
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const selectedPeriodOption = computed(() => props.data.options.periods.find((item) => item.id === selectedPeriod.value));
const emptyMessage = computed(() => filter.active.value ? "No hay materias que coincidan con los filtros." : "No hay materias programadas para este período.");
const periodLabel = (period: ScheduledSubjects["options"]["periods"][number]) =>
  `${period.code} · ${formatter.format(new Date(`${period.starts_on}T00:00:00Z`))} – ${formatter.format(new Date(`${period.ends_on}T00:00:00Z`))}`;
const changePeriod = (value: unknown) => {
  if (typeof value !== "string" || value === selectedPeriod.value) return;
  selectedPeriod.value = value;
  filter.clear();
  setPage(1);
  emit("period", value);
};
watch(() => props.data.selectedPeriodId, (value) => { selectedPeriod.value = value ?? ""; });
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4">
      <ClientFilterBar :filter="filter" input-id="scheduled-subjects-search" label="Buscar materia programada" placeholder="Buscar por materia, código, ciclo, paralelo o jornada">
        <template #filters>
          <Field data-wide><FieldLabel for="scheduled-subject-period" class="sr-only">Período académico</FieldLabel>
            <Select :model-value="selectedPeriod" @update:model-value="changePeriod">
              <SelectTrigger id="scheduled-subject-period"><SelectValue placeholder="Seleccione un período" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="period in data.options.periods" :key="period.id" :value="period.id">{{ periodLabel(period) }} · {{ period.status_label }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </template>
      </ClientFilterBar>
      <Alert v-if="selectedPeriodOption?.planning_enabled === false"><AlertDescription>Período finalizado · solo lectura</AlertDescription></Alert>
      <Table>
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Código</TableHead><TableHead>Ciclo</TableHead><TableHead>Paralelos y jornadas</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="5">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.id">
            <TableCell>{{ item.subject_name }}</TableCell>
            <TableCell>{{ item.subject_code }}</TableCell>
            <TableCell>{{ item.subject_cycle === null ? "Sin ciclo" : `${item.subject_cycle}.º` }}</TableCell>
            <TableCell><div class="flex flex-wrap gap-1.5"><Badge v-for="parallel in item.parallels" :key="parallel.id" variant="outline">{{ parallel.code }} · {{ shiftLabel(parallel.shift) }}</Badge><span v-if="!item.parallels.length" class="text-muted-foreground">Sin paralelos</span></div></TableCell>
            <TableCell class="text-right"><CareerAcademicActions entity="programacion_asignatura" :record="item" :record-label="item.label" :editable="item.editable" :edit-supported="false" :delete-supported="!data.career.lock_reason && item.period_planning_enabled" :parallel-creation-supported="!data.career.lock_reason && item.active && item.period_planning_enabled" :locked-label="!item.period_planning_enabled ? 'Período finalizado · solo lectura' : data.career.lock_reason ?? undefined" :options="data.options" @changed="emit('changed', $event)" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias programadas" @update:page="setPage" />
    </CardContent>
  </Card>
</template>
