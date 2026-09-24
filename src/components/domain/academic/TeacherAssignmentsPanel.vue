<script setup lang="ts">
import { MailCheck, UserRoundCog } from "@lucide/vue";
import { computed, ref } from "vue";
import { resendCareerTeacherInvitation, type TeacherAssignments } from "@/api/career-academics";
import { ApiError } from "@/api/client";
import CareerAcademicActions from "@/components/domain/academic/CareerAcademicActions.vue";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import TeacherReliefSheet from "@/components/domain/academic/TeacherReliefSheet.vue";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientFilter } from "@/composables/useClientFilter";
import { useClientPagination } from "@/composables/useClientPagination";
import { Spinner } from "@/components/ui/spinner";

const props = defineProps<{ data: TeacherAssignments }>();
const emit = defineEmits<{ changed: [message: string] }>();
type Assignment = TeacherAssignments["teacherAssignments"][number];
type TeacherRow = {
  id: string;
  user_id: string;
  parallel_id?: string;
  user_name: string;
  user_email: string;
  parallel_code: string | null;
  subject_name: string | null;
  period_name: string | null;
  period_status: Assignment["period_status"] | null;
  period_planning_enabled: boolean;
  active: boolean;
  editable: boolean;
  pending_activation: boolean;
};

const reliefOpen = ref(false);
const selected = ref<TeacherRow | null>(null);
const resendingId = ref<string | null>(null);
const resendError = ref<string | null>(null);
const rows = computed<TeacherRow[]>(() => {
  const pendingIds = new Set(props.data.pendingTeachers.map((teacher) => teacher.id));
  const assignedUserIds = new Set(props.data.teacherAssignments.map((item) => item.user_id));
  const pendingWithoutAssignment = props.data.pendingTeachers
    .filter((teacher) => !assignedUserIds.has(teacher.id))
    .map((teacher): TeacherRow => ({
      id: `pending-${teacher.id}`,
      user_id: teacher.id,
      user_name: teacher.name,
      user_email: teacher.email,
      parallel_code: null,
      subject_name: null,
      period_name: null,
      period_status: null,
      period_planning_enabled: false,
      active: true,
      editable: false,
      pending_activation: true,
    }));

  return [
    ...pendingWithoutAssignment,
    ...props.data.teacherAssignments.map((item): TeacherRow => ({
      ...item,
      pending_activation: pendingIds.has(item.user_id),
    })),
  ];
});
const statusOf = (item: TeacherRow): { label: string; hint: string } => {
  if (!item.active) return { label: "Finalizada", hint: "La asignación docente ya no está activa." };
  if (item.pending_activation) return { label: "Pendiente de activación", hint: "La cuenta espera que su titular abra la invitación y defina su contraseña." };
  return { label: "Activa", hint: "La asignación docente está vigente." };
};
const filter = useClientFilter(() => rows.value, (item) => [
  item.user_name,
  item.user_email,
  item.subject_name,
  item.parallel_code,
  item.period_name,
  statusOf(item).label,
], {
  estado: { matches: (item, value) => {
    if (value === "pending") return item.pending_activation;
    if (value === "active") return item.active && !item.pending_activation;
    return !item.active;
  } },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const openRelief = (item: TeacherRow): void => { selected.value = item; reliefOpen.value = true; };
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
const parallelLabel = (item: TeacherRow): string => [item.subject_name, item.parallel_code && `paralelo ${item.parallel_code}`, item.period_name].filter(Boolean).join(" · ");
const parallelCount = (teacherId: string) => props.data.teacherAssignments.filter((item) => item.user_id === teacherId && item.active && item.period_planning_enabled).length;
</script>

<template>
  <Card><CardContent class="flex flex-col gap-4">
    <ClientFilterBar :filter="filter" input-id="teacher-assignments-search" label="Buscar asignación docente" placeholder="Buscar por docente, correo, materia o paralelo">
      <template #filters><Field><FieldLabel for="teacher-assignments-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="teacher-assignments-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="pending">Pendiente de activación</SelectItem><SelectItem value="inactive">Finalizadas</SelectItem></SelectGroup></SelectContent></Select></Field></template>
    </ClientFilterBar>
    <p v-if="resendError" class="text-sm text-destructive" role="alert">{{ resendError }}</p>
    <Table><TableHeader><TableRow><TableHead>Docente</TableHead><TableHead>Materia</TableHead><TableHead>Periodo</TableHead><TableHead>Paralelo</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableEmpty v-if="!items.length" :colspan="6">{{ filter.active.value ? "Ningún registro coincide con la búsqueda." : "No existen docentes o asignaciones en esta carrera." }}</TableEmpty>
        <TableRow v-for="item in items" v-else :key="item.id">
          <TableCell><div class="flex flex-col"><span>{{ item.user_name }}</span><span class="text-sm text-muted-foreground">{{ item.user_email }}</span></div></TableCell>
          <TableCell>{{ item.subject_name ?? "—" }}</TableCell><TableCell>{{ item.period_name ?? "—" }}</TableCell><TableCell>{{ item.parallel_code ?? "—" }}</TableCell>
          <TableCell><Tooltip><TooltipTrigger as-child><span>{{ statusOf(item).label }}</span></TooltipTrigger><TooltipContent class="max-w-xs">{{ statusOf(item).hint }}</TooltipContent></Tooltip></TableCell>
          <TableCell class="text-right">
            <CareerAcademicActions v-if="item.parallel_id" entity="asignacion_docente" :record="item" :record-label="`la asignación de ${item.user_name}`" :editable="item.editable" :active="item.active" :allow-locked-actions="Boolean(data.career.lock_reason) && ((item.active && item.period_planning_enabled) || item.pending_activation)" :delete-supported="!data.career.lock_reason && item.period_planning_enabled" :locked-label="!item.period_planning_enabled ? (item.period_status === 'finalizado' ? 'Período finalizado · solo lectura' : 'Período inactivo · solo lectura') : data.career.lock_reason ?? undefined" @changed="emit('changed', $event)">
              <DropdownMenuItem v-if="item.pending_activation" :disabled="resendingId !== null" @select="resendInvitation(item.user_id)"><Spinner v-if="resendingId === item.user_id" data-icon="inline-start" /><MailCheck v-else data-icon="inline-start" aria-hidden="true" />Reenviar invitación</DropdownMenuItem>
              <DropdownMenuItem v-if="item.active && item.period_planning_enabled" @select="openRelief(item)"><UserRoundCog data-icon="inline-start" aria-hidden="true" />Relevar docente</DropdownMenuItem>
            </CareerAcademicActions>
            <TableActionsMenu v-else :label="`Acciones para ${item.user_name}`"><DropdownMenuItem :disabled="resendingId !== null" @select="resendInvitation(item.user_id)"><Spinner v-if="resendingId === item.user_id" data-icon="inline-start" /><MailCheck v-else data-icon="inline-start" aria-hidden="true" />Reenviar invitación</DropdownMenuItem></TableActionsMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <TablePagination :meta="meta" mode="client" label="Paginación de docentes y asignaciones" @update:page="setPage" />
  </CardContent></Card>

  <TeacherReliefSheet v-if="selected" v-model:open="reliefOpen" :outgoing-teacher="{ id: selected.user_id, name: selected.user_name, parallelCount: parallelCount(selected.user_id) }" :assignment="selected.parallel_id ? { id: selected.id, label: parallelLabel(selected) } : undefined" :options="data.options" @saved="emit('changed', $event)" />
</template>
