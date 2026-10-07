<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { MailCheck, Trash2, UserMinus } from "@lucide/vue";
import { computed, ref } from "vue";
import { removeCareerTeacher, resendCareerTeacherInvitation, type TeacherAssignments } from "@/api/career-academics";
import { ApiError } from "@/api/client";
import CareerTeacherEditSheet from "@/components/domain/academic/CareerTeacherEditSheet.vue";
import ClientFilterBar from "@/components/domain/ClientFilterBar.vue";
import { activateRow } from "@/lib/rowActivation";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
const statusOf = (item: TeacherRow): string => item.pending_activation
  ? "Pendiente de activación"
  : "Activa";
const filter = useClientFilter(() => rows.value, (item) => [item.name, item.email, statusOf(item)], {
  estado: { matches: (item, value) => value === "pending" ? item.pending_activation : !item.pending_activation },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const editing = ref<TeacherRow | null>(null);
const removing = ref<TeacherRow | null>(null);
const removeProcessing = ref(false);
const removeError = ref<string | null>(null);
const removeFromCareer = async (): Promise<void> => {
  if (!removing.value) return;
  removeProcessing.value = true;
  removeError.value = null;
  try {
    const result = await removeCareerTeacher(removing.value.id);
    removing.value = null;
    emit("changed", result.message);
  } catch (reason) {
    removeError.value = reason instanceof ApiError ? reason.message : "No se pudo quitar al docente de la carrera.";
  } finally {
    removeProcessing.value = false;
  }
};
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
        <TableRow v-for="item in items" v-else :key="item.id" class="cursor-pointer" tabindex="0" :aria-label="`Editar ${item.name}`" @click="activateRow($event, () => editing = item)" @keydown.enter.self.prevent="editing = item">
          <TableCell>{{ item.name }}</TableCell>
          <TableCell>{{ item.email }}</TableCell>
          <TableCell>{{ statusOf(item) }}</TableCell>
          <TableCell class="text-right">
            <TableActionsMenu :label="`Acciones para ${item.name}`">
              <DropdownMenuItem v-if="item.pending_activation" :disabled="resendingId !== null" @select="resendInvitation(item.id)"><Spinner v-if="resendingId === item.id" data-icon="inline-start" /><MailCheck v-else data-icon="inline-start" aria-hidden="true" />Reenviar invitación</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" :disabled="Boolean(data.career.lock_reason)" @select="removing = item; removeError = null"><UserMinus aria-hidden="true" />Quitar de la carrera</DropdownMenuItem>
            </TableActionsMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <CareerTeacherEditSheet v-if="editing" :key="editing.id" :teacher="editing" :open="true" @update:open="(value: boolean) => { if (!value) editing = null; }" @saved="emit('changed', $event)" />
    <TablePagination :meta="meta" mode="client" label="Paginación de docentes" @update:page="setPage" />
    <Dialog :open="removing !== null" @update:open="(value) => { if (!value) removing = null; }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar a {{ removing?.name }} de la carrera</DialogTitle>
          <DialogDescription>Deja de ser docente de esta carrera y sus paralelos quedan sin docente. Los sílabos se conservan; quien se asigne después empieza desde cero. Su cuenta y sus otros roles no cambian.</DialogDescription>
        </DialogHeader>
        <FeedbackAlert v-if="removeError" :message="removeError" />
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" :disabled="removeProcessing" @click="removeFromCareer"><Spinner v-if="removeProcessing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Quitar de la carrera</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardContent></Card>
</template>
