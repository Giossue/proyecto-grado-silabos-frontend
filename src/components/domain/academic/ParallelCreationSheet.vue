<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { Check, Pencil, Plus, Trash2, X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerRecord, createParallels, deleteCareerRecord, deleteParallel, updateParallel } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
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
  scheduledSubjectId: string;
  scheduledSubjectLabel: string;
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
const rowBusy = ref(false);
const rowError = ref<string | null>(null);
const startEdit = (parallel: { id: string; code: string; shift: string | null }) => {
  editingId.value = parallel.id;
  editCode.value = parallel.code;
  editShift.value = parallel.shift || defaultShift.value;
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
  if (!id) return;
  if (!editCode.value.trim() || !editShift.value) {
    rowError.value = "Escriba el código y elija la jornada del paralelo.";
    return;
  }
  await runRowAction(() => updateParallel(id, { code: editCode.value.trim(), shift: editShift.value }), "No se pudo actualizar el paralelo.");
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
const changeTeacher = (parallelId: string, value: unknown) => {
  if (typeof value !== "string") return;
  const current = assignmentOf(parallelId);
  if ((current?.user_id ?? NO_TEACHER) === value) return;
  void runRowAction(async () => {
    let result: { message: string } = { message: "Docente retirado del paralelo." };
    if (current) result = await deleteCareerRecord("asignacion_docente", current.id);
    if (value !== NO_TEACHER) result = await createCareerRecord("asignacion_docente", { user_id: value, parallel_id: parallelId });
    return result;
  }, "No se pudo cambiar el docente del paralelo.");
};
const submit = async (close: () => void) => {
  if (!code.value.trim() || !shift.value) {
    error.value = "Escriba el código y elija la jornada del paralelo.";
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    const result = await createParallels({
      scheduled_subject_id: props.scheduledSubjectId,
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
  <FormSheet
    v-model:open="open"
    :show-trigger="false"
    trigger-label="Agregar paralelo"
    title="Paralelos y docentes de la materia"
    :description="`Agregue, corrija o elimine los paralelos de ${scheduledSubjectLabel} y elija quién dicta cada uno.`"
  >
    <template #default="{ close }">
      <form class="contents" @submit.prevent="submit(close)">
        <FieldGroup>
          <Alert v-if="error && !fieldError" variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <Field :data-invalid="Boolean(fieldError)">
            <FieldLabel :for="`parallel-code-${scheduledSubjectId}`" required>Código de paralelo</FieldLabel>
            <Input
              :id="`parallel-code-${scheduledSubjectId}`"
              v-model="code"
              :maxlength="VALIDATION_LIMITS.parallelCode"
              placeholder="Ej. B"
              required
              :aria-invalid="Boolean(fieldError)"
            />
            <FieldError :errors="[fieldError]" />
          </Field>
          <Field>
            <FieldLabel :for="`parallel-shift-${scheduledSubjectId}`" required>Jornada</FieldLabel>
            <Select v-model="shift" required>
              <SelectTrigger :id="`parallel-shift-${scheduledSubjectId}`">
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
          <section class="flex flex-col gap-2" aria-labelledby="parallel-summary-title">
            <h3 id="parallel-summary-title" class="text-sm font-medium">Paralelos registrados</h3>
            <Alert v-if="rowError" variant="destructive"><AlertDescription>{{ rowError }}</AlertDescription></Alert>
            <div class="overflow-hidden rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Paralelo</TableHead><TableHead>Jornada</TableHead><TableHead>Docente</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableEmpty v-if="parallels.length === 0" :colspan="4">Sin paralelos registrados</TableEmpty>
                  <TableRow v-for="parallel in parallels" v-else :key="parallel.id">
                    <template v-if="editingId === parallel.id">
                      <TableCell><Input v-model="editCode" :maxlength="VALIDATION_LIMITS.parallelCode" class="w-20" :aria-label="`Código del paralelo ${parallel.code}`" :aria-invalid="!editCode.trim()" /></TableCell>
                      <TableCell>
                        <Select v-model="editShift">
                          <SelectTrigger class="w-36" :aria-label="`Jornada del paralelo ${parallel.code}`"><SelectValue placeholder="Elija la jornada" /></SelectTrigger>
                          <SelectContent><SelectGroup><SelectItem v-for="option in shiftOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}</TableCell>
                      <TableCell class="text-right">
                        <Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Guardar paralelo ${parallel.code}`" @click="saveEdit"><Check aria-hidden="true" /></Button>
                        <Button type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" aria-label="Cancelar edición" @click="cancelEdit"><X aria-hidden="true" /></Button>
                      </TableCell>
                    </template>
                    <template v-else>
                      <TableCell>{{ parallel.code }}</TableCell>
                      <TableCell>{{ shiftLabel(parallel.shift, shiftOptions) }}</TableCell>
                      <TableCell>
                        <Select v-if="teacherUsers" :model-value="teacherOf(parallel.id)" :disabled="rowBusy || (assignmentOf(parallel.id)?.editable === false)" @update:model-value="changeTeacher(parallel.id, $event)">
                          <SelectTrigger class="min-w-40 max-w-60" :aria-label="`Docente del paralelo ${parallel.code}`"><SelectValue placeholder="Sin docente" /></SelectTrigger>
                          <SelectContent><SelectGroup>
                            <SelectItem :value="NO_TEACHER">Sin docente</SelectItem>
                            <SelectItem v-for="user in teacherChoices(parallel.id)" :key="user.id" :value="user.id">{{ user.name }}</SelectItem>
                          </SelectGroup></SelectContent>
                        </Select>
                        <span v-else>{{ assignmentOf(parallel.id)?.user_name ?? "Sin docente" }}</span>
                      </TableCell>
                      <TableCell class="text-right">
                        <Button v-if="parallel.editable !== false" type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Editar paralelo ${parallel.code}`" @click="startEdit(parallel)"><Pencil aria-hidden="true" /></Button>
                        <Button v-if="parallel.deletable !== false && parallels.length > 1" type="button" size="icon-sm" variant="ghost" :disabled="rowBusy" :aria-label="`Eliminar paralelo ${parallel.code}`" @click="removeParallel(parallel.id)"><Trash2 aria-hidden="true" /></Button>
                      </TableCell>
                    </template>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p class="text-xs text-muted-foreground">Cambiar el docente conserva el sílabo del paralelo. Un paralelo con docente asignado o con sílabo no se elimina.</p>
          </section>
          <FormSheetActions :close="close" :processing="saving" :icon="Plus" label="Crear paralelo" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
