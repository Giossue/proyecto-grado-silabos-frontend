<script setup lang="ts">
import { LockKeyhole, Plus, Trash2 } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { deleteScheduledSubject, type ScheduledSubjects } from "@/api/career-academics";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import ParallelCreationSheet from "@/components/domain/academic/ParallelCreationSheet.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
type Row = ScheduledSubjects["scheduledSubjects"][number];
const selectedPeriod = ref(props.data.selectedPeriodId ?? "");
const parallelOpen = ref(false);
const deleteOpen = ref(false);
const selectedRow = ref<Row | null>(null);
const deleting = ref(false);
const deleteError = ref<string | null>(null);
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
const openParallel = (row: Row) => { selectedRow.value = row; parallelOpen.value = true; };
const openDelete = (row: Row) => { selectedRow.value = row; deleteError.value = null; deleteOpen.value = true; };
const remove = async () => {
  if (!selectedRow.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    const result = await deleteScheduledSubject(selectedRow.value.id);
    deleteOpen.value = false;
    emit("changed", result.message);
  } catch (reason) {
    deleteError.value = reason instanceof ApiError ? reason.message : "No se pudo eliminar la materia programada.";
  } finally {
    deleting.value = false;
  }
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
      <Alert v-if="selectedPeriodOption?.planning_enabled === false"><AlertDescription>El período finalizó. Su programación se conserva únicamente para consulta.</AlertDescription></Alert>
      <Table>
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Código</TableHead><TableHead>Ciclo</TableHead><TableHead>Paralelos y jornadas</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="5">{{ emptyMessage }}</TableEmpty>
          <TableRow v-for="item in items" v-else :key="item.id">
            <TableCell>{{ item.subject_name }}</TableCell>
            <TableCell>{{ item.subject_code }}</TableCell>
            <TableCell>{{ item.subject_cycle === null ? "Sin ciclo" : `${item.subject_cycle}.º` }}</TableCell>
            <TableCell><div class="flex flex-wrap gap-1.5"><Badge v-for="parallel in item.parallels" :key="parallel.id" variant="outline">{{ parallel.code }} · {{ shiftLabel(parallel.shift) }}</Badge><span v-if="!item.parallels.length" class="text-muted-foreground">Sin paralelos</span></div></TableCell>
            <TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${item.label}`">
              <DropdownMenuItem v-if="!item.period_planning_enabled || data.career.lock_reason" disabled><LockKeyhole aria-hidden="true" />{{ !item.period_planning_enabled ? "Período finalizado: disponible solo para consulta" : data.career.lock_reason }}</DropdownMenuItem>
              <DropdownMenuItem v-if="!data.career.lock_reason && item.active && item.period_planning_enabled" @select="openParallel(item)"><Plus aria-hidden="true" />Agregar paralelo</DropdownMenuItem>
              <DropdownMenuItem v-if="!data.career.lock_reason && item.period_planning_enabled && item.editable" variant="destructive" @select="openDelete(item)"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
            </TableActionsMenu></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias programadas" @update:page="setPage" />
    </CardContent>
  </Card>

  <ParallelCreationSheet v-if="selectedRow" :key="selectedRow.id" v-model:open="parallelOpen" :scheduled-subject-id="selectedRow.id" :scheduled-subject-label="selectedRow.label" :parallels="selectedRow.parallels" @saved="emit('changed', $event)" />
  <Dialog v-model:open="deleteOpen">
    <DialogContent><DialogHeader><DialogTitle>Eliminar materia programada</DialogTitle><DialogDescription>Se eliminarán también sus paralelos y asignaciones docentes. La operación se rechazará si existe algún sílabo relacionado, para conservar su historial.</DialogDescription></DialogHeader>
      <p v-if="deleteError" class="text-sm text-destructive">{{ deleteError }}</p>
      <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar materia programada</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
