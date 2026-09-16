<script setup lang="ts">
import { LockKeyhole, Trash2, UserRoundCog } from "@lucide/vue";
import { ref } from "vue";
import { ApiError } from "@/api/client";
import { deleteCareerRecord, type TeacherAssignments } from "@/api/career-academics";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import TeacherReliefSheet from "@/components/domain/academic/TeacherReliefSheet.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientFilter } from "@/composables/useClientFilter";
import { useClientPagination } from "@/composables/useClientPagination";

const props = defineProps<{ data: TeacherAssignments }>();
const emit = defineEmits<{ changed: [message: string] }>();
type Assignment = TeacherAssignments["teacherAssignments"][number];
const reliefOpen = ref(false);
const deleteOpen = ref(false);
const selected = ref<Assignment | null>(null);
const deleting = ref(false);
const deleteError = ref<string | null>(null);
const filter = useClientFilter(() => props.data.teacherAssignments, (item) => [item.user_name, item.user_email, item.subject_name, item.parallel_code, item.period_name], {
  estado: { matches: (item, value) => item.active === (value === "active") },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const openRelief = (item: Assignment) => { selected.value = item; reliefOpen.value = true; };
const openDelete = (item: Assignment) => { selected.value = item; deleteError.value = null; deleteOpen.value = true; };
const remove = async () => {
  if (!selected.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    const result = await deleteCareerRecord("asignacion_docente", selected.value.id);
    deleteOpen.value = false;
    emit("changed", result.message);
  } catch (reason) {
    deleteError.value = reason instanceof ApiError ? reason.message : "No se pudo eliminar la asignación.";
  } finally { deleting.value = false; }
};
const parallelCount = (teacherId: string) => props.data.teacherAssignments.filter((item) => item.user_id === teacherId && item.active && item.period_planning_enabled).length;
</script>

<template>
  <Card><CardContent class="flex flex-col gap-4">
    <ClientFilterBar :filter="filter" input-id="teacher-assignments-search" label="Buscar asignación docente" placeholder="Buscar por docente, correo, materia o paralelo">
      <template #filters><Field><FieldLabel for="teacher-assignments-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="teacher-assignments-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="inactive">Finalizadas</SelectItem></SelectGroup></SelectContent></Select></Field></template>
    </ClientFilterBar>
    <Table><TableHeader><TableRow><TableHead>Docente</TableHead><TableHead>Materia</TableHead><TableHead>Periodo</TableHead><TableHead>Paralelo</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableEmpty v-if="!items.length" :colspan="6">{{ filter.active.value ? "Ninguna asignación coincide con la búsqueda." : "No existen asignaciones docentes en esta carrera." }}</TableEmpty>
        <TableRow v-for="item in items" v-else :key="item.id">
          <TableCell><div class="flex flex-col"><span>{{ item.user_name }}</span><span class="text-xs text-muted-foreground">{{ item.user_email }}</span></div></TableCell>
          <TableCell>{{ item.subject_name }}</TableCell><TableCell>{{ item.period_name }}</TableCell><TableCell>{{ item.parallel_code }}</TableCell><TableCell>{{ item.active ? "Activa" : "Finalizada" }}</TableCell>
          <TableCell class="text-right"><TableActionsMenu :label="`Acciones para la asignación de ${item.user_name}`">
            <DropdownMenuItem v-if="data.career.lock_reason || !item.period_planning_enabled" disabled><LockKeyhole aria-hidden="true" />{{ data.career.lock_reason ?? (item.period_status === "finalizado" ? "Período finalizado: disponible solo para consulta" : "Período inactivo: disponible solo para consulta") }}</DropdownMenuItem>
            <DropdownMenuItem v-if="!data.career.lock_reason && item.active && item.period_planning_enabled" @select="openRelief(item)"><UserRoundCog aria-hidden="true" />Relevar docente</DropdownMenuItem>
            <DropdownMenuItem v-if="!data.career.lock_reason && item.editable" variant="destructive" @select="openDelete(item)"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
          </TableActionsMenu></TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <TablePagination :meta="meta" mode="client" label="Paginación de asignaciones docentes" @update:page="setPage" />
  </CardContent></Card>

  <TeacherReliefSheet v-if="selected" v-model:open="reliefOpen" :outgoing-teacher="{ id: selected.user_id, name: selected.user_name, parallelCount: parallelCount(selected.user_id) }" :options="data.options" @saved="emit('changed', $event)" />
  <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar asignación docente</DialogTitle><DialogDescription>La operación se rechazará si la asignación ya forma parte de un sílabo. Use el relevo docente para cambiar responsables de expedientes existentes.</DialogDescription></DialogHeader><p v-if="deleteError" class="text-sm text-destructive">{{ deleteError }}</p><DialogFooter><DialogClose as-child><Button variant="outline">Cancelar</Button></DialogClose><Button variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar asignación</Button></DialogFooter></DialogContent></Dialog>
</template>
