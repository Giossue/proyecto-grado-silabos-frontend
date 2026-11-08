<script setup lang="ts">
import TablePagination from '@/components/domain/TablePagination.vue';
import { useClientPagination } from '@/composables/useClientPagination';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { Check, Pencil, Plus, Trash2, X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerRecord, createParallels, deleteCareerRecord, deleteParallel, replaceParallelTeacher, updateParallel } from "@/api/career-academics";
import FormDialog from "@/components/domain/FormDialog.vue";
import TeacherSelect from "@/components/domain/academic/TeacherSelect.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { shiftLabel } from "@/lib/parallelShifts";

const props = defineProps<{
  shiftOptions: Array<{ value: string; label: string }>;
  subjectId: string;
  subjectLabel: string;
  parallels: Array<{ id: string; code: string; shift: string | null; editable?: boolean; deletable?: boolean }>;
  teacherUsers?: Array<{ id: string; name: string; email: string }>;
  assignments?: Array<{ id: string; parallel_id: string; user_id: string; user_name: string; active: boolean; editable: boolean }>;
}>();
const emit = defineEmits<{ saved: [message: string]; changed: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const defaultShift = computed(() => props.shiftOptions[0]?.value ?? '');
const code = ref("");
const shift = ref(defaultShift.value);
const adding = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const reset = () => {
  adding.value = false;
  code.value = "";
  shift.value = defaultShift.value;
  error.value = null;
  editingId.value = null;
  rowError.value = null;
};
const editingId = ref<string | null>(null);
const editCode = ref("");
const editShift = ref(defaultShift.value);
const editTeacher = ref("none");
const rowBusy = ref(false);
const rowError = ref<string | null>(null);
const startEdit = (parallel: { id: string; code: string; shift: string | null }) => {
  editingId.value = parallel.id;
  editCode.value = parallel.code;
  editShift.value = parallel.shift || defaultShift.value;
  editTeacher.value = teacherOf(parallel.id);
  rowError.value = null;
};
const cancelEdit = () => {
  editingId.value = null;
  rowError.value = null;
};
const runRowAction = async (action: () => Promise<{ message: string }>, fallback: string) => {
  rowBusy.value = true;
  rowError.value = null;
  try {
    const result = await action();
    editingId.value = null;
    emit("changed", result.message);
  } catch (reason) {
    rowError.value = reason instanceof ApiError ? reason.message : fallback;
  } finally {
    rowBusy.value = false;
  }
};
const saveEdit = async () => {
  const id = editingId.value;
  const parallel = props.parallels.find((item) => item.id === id);
  if (!id || !parallel) return;
  const editable = parallel.editable !== false;
  if (editable && (!editCode.value.trim() || !editShift.value)) {
    rowError.value = "Escriba el código y elija la jornada del paralelo";
    return;
  }
  await runRowAction(async () => {
    let result: { message: string } = { message: "Sin cambios" };
    if (editable && (editCode.value.trim() !== parallel.code || editShift.value !== (parallel.shift || defaultShift.value))) {
      result = await updateParallel(id, { code: editCode.value.trim(), shift: editShift.value });
    }
    if (teacherEditable(id) && editTeacher.value !== teacherOf(id)) result = await replaceTeacher(id, editTeacher.value);
    return result;
  }, "No se pudo actualizar el paralelo");
};
const removeParallel = (id: string) => runRowAction(() => deleteParallel(id), "No se pudo eliminar el paralelo");
const NO_TEACHER = "none";
const assignmentOf = (parallelId: string) => (props.assignments ?? []).find((item) => item.parallel_id === parallelId && item.active) ?? null;
const teacherOf = (parallelId: string) => assignmentOf(parallelId)?.user_id ?? NO_TEACHER;
const teacherChoices = (parallelId: string) => {
  const current = assignmentOf(parallelId);
  const users = props.teacherUsers ?? [];
  return current && !users.some((user) => user.id === current.user_id)
    ? [{ id: current.user_id, name: current.user_name, email: "" }, ...users]
    : users;
};
const teacherEditable = (parallelId: string): boolean => Boolean(props.teacherUsers) && assignmentOf(parallelId)?.editable !== false;
const canEditRow = (parallel: { id: string; editable?: boolean }): boolean => parallel.editable !== false || teacherEditable(parallel.id);
const { items: pagedParallels, meta, setPage } = useClientPagination(() => props.parallels, 20);
const canDeleteParallel = (parallel: { deletable?: boolean }): boolean => parallel.deletable !== false && props.parallels.length > 1;
const canRemoveTeacher = (parallelId: string): boolean => assignmentOf(parallelId) !== null && teacherEditable(parallelId);
const showActions = computed(() => editingId.value !== null
  || props.parallels.some((parallel) => canEditRow(parallel) || canRemoveTeacher(parallel.id) || canDeleteParallel(parallel)));
const replaceTeacher = async (parallelId: string, value: string): Promise<{ message: string }> => {
  const current = assignmentOf(parallelId);
  if (current && value !== NO_TEACHER) return replaceParallelTeacher(parallelId, value);
  if (current) return deleteCareerRecord("asignacion_docente", current.id);
  if (value !== NO_TEACHER) return createCareerRecord("asignacion_docente", { user_id: value, parallel_id: parallelId });
  return { message: "Docente retirado del paralelo" };
};
const removeTeacher = (parallelId: string) => runRowAction(() => replaceTeacher(parallelId, NO_TEACHER), "No se pudo quitar el docente del paralelo");
const newTeacher = ref("");
const startAdd = () => {
  newTeacher.value = "";
  code.value = "";
  shift.value = defaultShift.value;
  error.value = null;
  editingId.value = null;
  adding.value = true;
};
const cancelAdd = () => {
  adding.value = false;
  error.value = null;
};
const submit = async () => {
  if (saving.value) return;
  if (!code.value.trim() || !shift.value || !newTeacher.value) {
    error.value = "Escriba el código y elija la jornada y el docente del paralelo";
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const result = await createParallels({
      subject_id: props.subjectId,
      codes: [code.value.trim()],
      shift: shift.value,
      user_id: newTeacher.value,
    });
    emit("saved", result.message);
    reset();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo crear el paralelo";
  } finally {
    saving.value = false;
  }
};
watch(open, (value) => value && reset());
</script>

<template>
  <FormDialog
    v-model:open="open"
    compact
    no-footer
    :show-trigger="false"
    trigger-label="Agregar paralelo"
    title="Paralelos y docentes de la materia"
    description="Agregue paralelos y asigne el docente de cada uno"
  >
    <template #default="{ close }">
      <div class="contents">
        <FieldGroup>
          <Alert v-if="error" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <section class="flex flex-col gap-2">
            <Alert v-if="rowError" variant="destructive"><AlertDescription>{{ rowError }}</AlertDescription></Alert>
            <div class="overflow-hidden rounded-md ring-1 ring-surface-ring">
              <Table label="Paralelos de la materia">
                <TableHeader><TableRow><TableHead>Paralelo</TableHead><TableHead>Jornada</TableHead><TableHead>Docente</TableHead><TableHead v-if="showActions || adding" class="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableEmpty v-if="parallels.length === 0 && !adding" :colspan="showActions ? 4 : 3">Sin paralelos registrados</TableEmpty>
                  <TableRow v-for="parallel in pagedParallels" v-else :key="parallel.id">
                    <template v-if="editingId === parallel.id">
                      <TableCell v-if="parallel.editable === false">{{ parallel.code }}</TableCell>
                      <TableCell v-else><Input v-model="editCode" :maxlength="VALIDATION_LIMITS.parallelCode" class="w-20" :aria-label="`Código del paralelo ${parallel.code}`" :aria-invalid="!editCode.trim()" /></TableCell>
                      <TableCell v-if="parallel.editable === false">{{ shiftLabel(parallel.shift, shiftOptions) }}</TableCell>
                      <TableCell v-else>
                        <Select v-model="editShift">
                          <SelectTrigger class="w-36" :aria-label="`Jornada del paralelo ${parallel.code}`"><SelectValue placeholder="Elija la jornada" /></SelectTrigger>
                          <SelectContent><SelectGroup><SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TeacherSelect v-if="teacherEditable(parallel.id)" v-model="editTeacher" :teachers="teacherChoices(parallel.id)" :label="`Docente del paralelo ${parallel.code}`" />
                        <span v-else>{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}</span>
                      </TableCell>
                      <TableCell class="text-right">
                        <TooltipProvider><Tooltip><TooltipTrigger as-child><Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy || !editCode.trim() || !editShift" :aria-label="`Guardar paralelo ${parallel.code}`" @click="saveEdit"><Check aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Guardar</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger as-child><Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" aria-label="Cancelar edición" @click="cancelEdit"><X aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Cancelar</TooltipContent></Tooltip></TooltipProvider>
                      </TableCell>
                    </template>
                    <template v-else>
                      <TableCell>{{ parallel.code }}</TableCell>
                      <TableCell>{{ shiftLabel(parallel.shift, shiftOptions) }}</TableCell>
                      <TableCell :class="assignmentOf(parallel.id) ? '' : 'text-muted-foreground'">{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}
                      </TableCell>
                      <TableCell v-if="showActions" class="text-right">
                        <TooltipProvider v-if="canEditRow(parallel)"><Tooltip><TooltipTrigger as-child><Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Editar paralelo ${parallel.code}`" @click="startEdit(parallel)"><Pencil aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Editar paralelo</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider v-if="canRemoveTeacher(parallel.id)"><Tooltip><TooltipTrigger as-child><Button type="button" size="icon-sm" variant="ghost" class="text-destructive hover:bg-destructive/10 hover:text-destructive" :disabled="rowBusy" :aria-label="`Quitar el docente del paralelo ${parallel.code}`" @click="removeTeacher(parallel.id)"><Trash2 aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Quitar docente</TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider v-else-if="canDeleteParallel(parallel)"><Tooltip><TooltipTrigger as-child><Button type="button" size="icon-sm" variant="ghost" class="text-destructive hover:bg-destructive/10 hover:text-destructive" :disabled="rowBusy" :aria-label="`Eliminar paralelo ${parallel.code}`" @click="removeParallel(parallel.id)"><Trash2 aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Eliminar paralelo</TooltipContent></Tooltip></TooltipProvider>
                      </TableCell>
                    </template>
                  </TableRow>
                  <TableRow v-if="adding">
                    <TableCell><Input :id="`parallel-code-${subjectId}`" v-model="code" :maxlength="VALIDATION_LIMITS.parallelCode" class="w-20" placeholder="Ej. B" aria-label="Código del nuevo paralelo" :aria-invalid="Boolean(error) && !code.trim()" @keydown.enter.prevent="submit" /></TableCell>
                    <TableCell>
                      <Select v-model="shift">
                        <SelectTrigger class="w-36" aria-label="Jornada del nuevo paralelo"><SelectValue placeholder="Elija la jornada" /></SelectTrigger>
                        <SelectContent><SelectGroup><SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TeacherSelect v-model="newTeacher" :teachers="teacherUsers ?? []" label="Docente del nuevo paralelo" required :invalid="Boolean(error) && !newTeacher" />
                    </TableCell>
                    <TableCell class="text-right">
                      <IconTooltip label="Guardar nuevo paralelo"><Button type="button" size="icon-sm" variant="ghost" :disabled="saving || !code.trim() || !shift || !newTeacher" aria-label="Guardar nuevo paralelo" @click="submit"><Check aria-hidden="true" /></Button></IconTooltip>
                      <IconTooltip label="Cancelar nuevo paralelo"><Button type="button" size="icon-sm" variant="ghost" :disabled="saving" aria-label="Cancelar nuevo paralelo" @click="cancelAdd"><X aria-hidden="true" /></Button></IconTooltip>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <TablePagination :meta="meta" label="Paginación de paralelos" @update:page="setPage" />
            <Button type="button" size="sm" variant="outline" class="self-start" :disabled="adding || rowBusy" @click="startAdd"><Plus aria-hidden="true" /> Agregar paralelo</Button>
          </section>
          <DialogFooter><Button type="button" variant="outline" @click="close">Cerrar</Button></DialogFooter>
        </FieldGroup>
      </div>
    </template>
  </FormDialog>
</template>
