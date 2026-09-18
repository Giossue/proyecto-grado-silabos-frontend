<script setup lang="ts">
import { MailCheck, UserRoundCog } from "@lucide/vue";
import { ref } from "vue";
import { resendCareerTeacherInvitation, type TeacherAssignments } from "@/api/career-academics";
import { ApiError } from "@/api/client";
import CareerAcademicActions from "@/components/domain/academic/CareerAcademicActions.vue";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import TeacherReliefSheet from "@/components/domain/academic/TeacherReliefSheet.vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientFilter } from "@/composables/useClientFilter";
import { useClientPagination } from "@/composables/useClientPagination";
import { Spinner } from "@/components/ui/spinner";

const props = defineProps<{ data: TeacherAssignments }>();
const emit = defineEmits<{ changed: [message: string] }>();
type Assignment = TeacherAssignments["teacherAssignments"][number];
const reliefOpen = ref(false);
const selected = ref<Assignment | null>(null);
const resendingId = ref<string | null>(null);
const resendError = ref<string | null>(null);
const filter = useClientFilter(() => props.data.teacherAssignments, (item) => [item.user_name, item.user_email, item.subject_name, item.parallel_code, item.period_name], {
  estado: { matches: (item, value) => item.active === (value === "active") },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const openRelief = (item: Assignment) => { selected.value = item; reliefOpen.value = true; };
const resendInvitation = async (userId: string): Promise<void> => {
  resendingId.value = userId;
  resendError.value = null;
  try {
    const result = await resendCareerTeacherInvitation(userId);
    emit("changed", result.message);
  } catch (reason) {
    resendError.value = reason instanceof ApiError ? reason.message : "No se pudo reenviar la invitación.";
  } finally {
    resendingId.value = null;
  }
};
const parallelCount = (teacherId: string) => props.data.teacherAssignments.filter((item) => item.user_id === teacherId && item.active && item.period_planning_enabled).length;
</script>

<template>
  <Card v-if="data.pendingTeachers.length" class="border-dashed"><CardHeader><CardTitle class="text-base">Invitaciones pendientes</CardTitle><CardDescription>Estos docentes aún no han verificado su correo. Puede emitirles un enlace nuevo si el anterior venció.</CardDescription></CardHeader><CardContent class="grid gap-3"><p v-if="resendError" class="text-sm text-destructive" role="alert">{{ resendError }}</p><div v-for="teacher in data.pendingTeachers" :key="teacher.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div class="min-w-0"><p class="font-medium">{{ teacher.name }}</p><p class="truncate text-sm text-muted-foreground">{{ teacher.email }}</p></div><Button type="button" variant="outline" size="sm" :disabled="resendingId !== null" @click="resendInvitation(teacher.id)"><Spinner v-if="resendingId === teacher.id" /><MailCheck v-else aria-hidden="true" />Reenviar invitación</Button></div></CardContent></Card>
  <Card><CardContent class="flex flex-col gap-4">
    <ClientFilterBar :filter="filter" input-id="teacher-assignments-search" label="Buscar asignación docente" placeholder="Buscar por docente, correo, materia o paralelo">
      <template #filters><Field><FieldLabel for="teacher-assignments-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="teacher-assignments-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="inactive">Finalizadas</SelectItem></SelectGroup></SelectContent></Select></Field></template>
    </ClientFilterBar>
    <Table><TableHeader><TableRow><TableHead>Docente</TableHead><TableHead>Materia</TableHead><TableHead>Periodo</TableHead><TableHead>Paralelo</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableEmpty v-if="!items.length" :colspan="6">{{ filter.active.value ? "Ninguna asignación coincide con la búsqueda." : "No existen asignaciones docentes en esta carrera." }}</TableEmpty>
        <TableRow v-for="item in items" v-else :key="item.id">
          <TableCell>{{ item.user_name }}</TableCell>
          <TableCell>{{ item.subject_name }}</TableCell><TableCell>{{ item.period_name }}</TableCell><TableCell>{{ item.parallel_code }}</TableCell><TableCell>{{ item.active ? "Activa" : "Finalizada" }}</TableCell>
          <TableCell class="text-right"><CareerAcademicActions entity="asignacion_docente" :record="item" :record-label="`la asignación de ${item.user_name}`" :editable="item.editable" :active="item.active" :allow-locked-actions="Boolean(data.career.lock_reason) && item.active && item.period_planning_enabled" :delete-supported="!data.career.lock_reason && item.period_planning_enabled" :locked-label="!item.period_planning_enabled ? (item.period_status === 'finalizado' ? 'Período finalizado · solo lectura' : 'Período inactivo · solo lectura') : data.career.lock_reason ?? undefined" :options="data.options" @changed="emit('changed', $event)"><DropdownMenuItem v-if="item.active && item.period_planning_enabled" @select="openRelief(item)"><UserRoundCog aria-hidden="true" />Relevar docente</DropdownMenuItem></CareerAcademicActions></TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <TablePagination :meta="meta" mode="client" label="Paginación de asignaciones docentes" @update:page="setPage" />
  </CardContent></Card>

  <TeacherReliefSheet v-if="selected" v-model:open="reliefOpen" :outgoing-teacher="{ id: selected.user_id, name: selected.user_name, parallelCount: parallelCount(selected.user_id) }" :options="data.options" @saved="emit('changed', $event)" />
</template>
