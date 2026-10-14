<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { Check, Pencil, Plus, Trash2, X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerRecord, createParallels, deleteCareerRecord, deleteParallel, updateParallel } from "@/api/career-academics";
import FormDialog from "@/components/domain/FormDialog.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
const saving = ref(false);
const error = ref<string | null>(null);
const fieldError = computed(() => (error.value && code.value.trim() === "" ? error.value : undefined));

const reset = () => {
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
    rowError.value = "Escriba el código y elija la jornada del paralelo.";
    return;
  }
  await runRowAction(async () => {
    let result: { message: string } = { message: "Sin cambios." };
    if (editable && (editCode.value.trim() !== parallel.code || editShift.value !== (parallel.shift || defaultShift.value))) {
      result = await updateParallel(id, { code: editCode.value.trim(), shift: editShift.value });
    }
    if (teacherEditable(id) && editTeacher.value !== teacherOf(id)) result = await replaceTeacher(id, editTeacher.value);
    return result;
  }, "No se pudo actualizar el paralelo.");
};
const removeParallel = (id: string) => runRowAction(() => deleteParallel(id), "No se pudo eliminar el paralelo.");
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
const canDeleteParallel = (parallel: { deletable?: boolean }): boolean => parallel.deletable !== false && props.parallels.length > 1;
const canRemoveTeacher = (parallelId: string): boolean => assignmentOf(parallelId) !== null && teacherEditable(parallelId);
const showActions = computed(() => editingId.value !== null
  || props.parallels.some((parallel) => canEditRow(parallel) || canRemoveTeacher(parallel.id) || canDeleteParallel(parallel)));
const replaceTeacher = async (parallelId: string, value: string): Promise<{ message: string }> => {
  const current = assignmentOf(parallelId);
  let result: { message: string } = { message: "Docente retirado del paralelo." };
  if (current) result = await deleteCareerRecord("asignacion_docente", current.id);
  if (value !== NO_TEACHER) result = await createCareerRecord("asignacion_docente", { user_id: value, parallel_id: parallelId });
  return result;
};
const removeTeacher = (parallelId: string) => runRowAction(() => replaceTeacher(parallelId, NO_TEACHER), "No se pudo quitar el docente del paralelo.");
const submit = async (close: () => void) => {
  if (!code.value.trim() || !shift.value) {
    error.value = "Escriba el código y elija la jornada del paralelo.";
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const result = await createParallels({
      subject_id: props.subjectId,
      codes: [code.value.trim()],
      shift: shift.value,
    });
    emit("saved", result.message);
    reset();
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo crear el paralelo.";
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
    :show-trigger="false"
    trigger-label="Agregar paralelo"
    title="Paralelos y docentes de la materia"
  >
    <template #default="{ close }">
      <form class="contents" @submit.prevent="submit(close)">
        <FieldGroup>
          <Alert v-if="error && !fieldError" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <div class="grid items-start gap-4 sm:grid-cols-2">
          <Field :data-invalid="Boolean(fieldError)">
            <FieldLabel :for="`parallel-code-${subjectId}`" required>Código de paralelo</FieldLabel>
            <Input
              :id="`parallel-code-${subjectId}`"
              v-model="code"
              :maxlength="VALIDATION_LIMITS.parallelCode"
              placeholder="Ej. B"
              required
              :aria-invalid="Boolean(fieldError)"
            />
            <FieldError :errors="[fieldError]" />
          </Field>
          <Field>
            <FieldLabel :for="`parallel-shift-${subjectId}`" required>Jornada</FieldLabel>
            <Select v-model="shift" required>
              <SelectTrigger :id="`parallel-shift-${subjectId}`">
                <SelectValue placeholder="Elija la jornada" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          </div>
          <section class="flex flex-col gap-2" aria-labelledby="parallel-summary-title">
            <h3 id="parallel-summary-title" class="text-sm font-medium">Paralelos registrados</h3>
            <Alert v-if="rowError" variant="destructive"><AlertDescription>{{ rowError }}</AlertDescription></Alert>
            <div class="overflow-hidden rounded-md border">
              <Table label="Paralelos de la materia">
                <TableHeader><TableRow><TableHead>Paralelo</TableHead><TableHead>Jornada</TableHead><TableHead>Docente</TableHead><TableHead v-if="showActions" class="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableEmpty v-if="parallels.length === 0" :colspan="showActions ? 4 : 3">Sin paralelos registrados</TableEmpty>
                  <TableRow v-for="parallel in parallels" v-else :key="parallel.id">
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
                        <Select v-if="teacherEditable(parallel.id)" v-model="editTeacher">
                          <SelectTrigger class="min-w-40 max-w-60" :aria-label="`Docente del paralelo ${parallel.code}`"><SelectValue placeholder="Elija el docente" /></SelectTrigger>
                          <SelectContent><SelectGroup>
                            <SelectItem v-for="user in teacherChoices(parallel.id)" :key="user.id" :value="user.id">{{ user.name }}</SelectItem>
                          </SelectGroup></SelectContent>
                        </Select>
                        <span v-else>{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}</span>
                      </TableCell>
                      <TableCell class="text-right">
                        <Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Guardar paralelo ${parallel.code}`" @click="saveEdit"><Check aria-hidden="true" /></Button>
                        <Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" aria-label="Cancelar edición" @click="cancelEdit"><X aria-hidden="true" /></Button>
                      </TableCell>
                    </template>
                    <template v-else>
                      <TableCell>{{ parallel.code }}</TableCell>
                      <TableCell>{{ shiftLabel(parallel.shift, shiftOptions) }}</TableCell>
                      <TableCell :class="assignmentOf(parallel.id) ? '' : 'text-muted-foreground'">{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}
                      </TableCell>
                      <TableCell v-if="showActions" class="text-right">
                        <Button v-if="canEditRow(parallel)" type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Editar paralelo ${parallel.code}`" @click="startEdit(parallel)"><Pencil aria-hidden="true" /></Button>
                        <Button v-if="canRemoveTeacher(parallel.id)" type="button" size="icon-sm" variant="ghost" class="text-destructive hover:bg-destructive/10 hover:text-destructive" :disabled="rowBusy" :aria-label="`Quitar el docente del paralelo ${parallel.code}`" @click="removeTeacher(parallel.id)"><Trash2 aria-hidden="true" /></Button>
                        <Button v-else-if="canDeleteParallel(parallel)" type="button" size="icon-sm" variant="ghost" class="text-destructive hover:bg-destructive/10 hover:text-destructive" :disabled="rowBusy" :aria-label="`Eliminar paralelo ${parallel.code}`" @click="removeParallel(parallel.id)"><Trash2 aria-hidden="true" /></Button>
                      </TableCell>
                    </template>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p class="text-xs text-muted-foreground">Con el lápiz cambia el paralelo o su docente; con el basurero quita el docente. Cambiar o quitar el docente borra el sílabo del paralelo con todo lo que hizo: el siguiente docente empieza en limpio. Cambiar la jornada o el código solo lo borra si el sílabo ya fue enviado; antes de eso se conserva lo escrito.</p>
          </section>
          <FormSheetActions :close="close" :processing="saving" :icon="Plus" label="Crear paralelo" />
        </FieldGroup>
      </form>
    </template>
  </FormDialog>
</template>
