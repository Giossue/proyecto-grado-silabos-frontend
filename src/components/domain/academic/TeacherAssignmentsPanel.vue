<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { MailCheck } from "@lucide/vue";
import { computed, ref } from "vue";
import { resendCareerTeacherInvitation, type TeacherAssignments } from "@/api/career-academics";
import { ApiError } from "@/api/client";
import CareerTeacherEditSheet from "@/components/domain/academic/CareerTeacherEditSheet.vue";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClientFilter } from "@/composables/useClientFilter";
import { useClientPagination } from "@/composables/useClientPagination";
import { Spinner } from "@/components/ui/spinner";

/** Una fila por docente de la carrera. */
const props = defineProps<{ data: TeacherAssignments }>();
const emit = defineEmits<{ changed: [message: string] }>();
type TeacherRow = {
  id: string;
  name: string;
  email: string;
  pending_activation: boolean;
};

const resendingId = ref<string | null>(null);
const resendError = ref<string | null>(null);
const rows = computed<TeacherRow[]>(() => props.data.careerTeachers.map((teacher) => ({
  id: teacher.id,
  name: teacher.name,
  email: teacher.email,
  pending_activation: teacher.pending_activation,
})));
const statusOf = (item: TeacherRow): { label: string; hint: string } => item.pending_activation
  ? { label: "Pendiente de activación", hint: "La cuenta espera que su titular abra la invitación y defina su contraseña." }
  : { label: "Activa", hint: "La cuenta está activa; su titular ya definió su contraseña." };
const filter = useClientFilter(() => rows.value, (item) => [item.name, item.email, statusOf(item).label], {
  estado: { matches: (item, value) => value === "pending" ? item.pending_activation : !item.pending_activation },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
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
</script>

<template>
  <Card><CardContent class="flex flex-col gap-4">
    <ClientFilterBar :filter="filter" input-id="teacher-assignments-search" label="Buscar docente" placeholder="Buscar por docente o correo">
      <template #filters><Field><FieldLabel for="teacher-assignments-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="teacher-assignments-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activas</SelectItem><SelectItem value="pending">Pendiente de activación</SelectItem></SelectGroup></SelectContent></Select></Field></template>
    </ClientFilterBar>
    <FeedbackAlert v-if="resendError" :message="resendError" />
    <Table><TableHeader><TableRow><TableHead>Docente</TableHead><TableHead>Correo</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableEmpty v-if="!items.length" :colspan="4">{{ filter.active.value ? "Ningún docente coincide con la búsqueda." : "No existen docentes en esta carrera." }}</TableEmpty>
        <TableRow v-for="item in items" v-else :key="item.id">
          <TableCell>{{ item.name }}</TableCell>
          <TableCell>{{ item.email }}</TableCell>
          <TableCell><Tooltip><TooltipTrigger as-child><span>{{ statusOf(item).label }}</span></TooltipTrigger><TooltipContent class="max-w-xs">{{ statusOf(item).hint }}</TooltipContent></Tooltip></TableCell>
          <TableCell class="text-right">
            <TableActionsMenu :label="`Acciones para ${item.name}`">
              <CareerTeacherEditSheet :teacher="item" @saved="emit('changed', $event)" />
              <DropdownMenuItem v-if="item.pending_activation" :disabled="resendingId !== null" @select="resendInvitation(item.id)"><Spinner v-if="resendingId === item.id" data-icon="inline-start" /><MailCheck v-else data-icon="inline-start" aria-hidden="true" />Reenviar invitación</DropdownMenuItem>
            </TableActionsMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <TablePagination :meta="meta" mode="client" label="Paginación de docentes" @update:page="setPage" />
  </CardContent></Card>
</template>
