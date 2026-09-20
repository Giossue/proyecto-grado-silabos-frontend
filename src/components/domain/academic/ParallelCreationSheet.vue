<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createParallels } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PARALLEL_SHIFTS, shiftLabel } from "@/lib/parallelShifts";

const props = defineProps<{
  scheduledSubjectId: string;
  scheduledSubjectLabel: string;
  parallels: Array<{ id: string; code: string; shift: string | null }>;
}>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const code = ref("");
const shift = ref("");
const saving = ref(false);
const error = ref<string | null>(null);
const fieldError = computed(() => (error.value && code.value.trim() === "" ? error.value : undefined));

const reset = () => {
  code.value = "";
  shift.value = "";
  error.value = null;
};
const submit = async (close: () => void) => {
  if (!code.value.trim()) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await createParallels({
      scheduled_subject_id: props.scheduledSubjectId,
      codes: [code.value.trim()],
      shift: shift.value || null,
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
    title="Agregar paralelo"
    :description="`Añada un paralelo a la materia ${scheduledSubjectLabel} y defina su jornada.`"
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
              maxlength="30"
              placeholder="Ej. B"
              required
              :aria-invalid="Boolean(fieldError)"
            />
            <FieldError :errors="[fieldError]" />
          </Field>
          <Field>
            <FieldLabel :for="`parallel-shift-${scheduledSubjectId}`">Jornada</FieldLabel>
            <Select v-model="shift">
              <SelectTrigger :id="`parallel-shift-${scheduledSubjectId}`">
                <SelectValue placeholder="Sin jornada definida" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="option in PARALLEL_SHIFTS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <section class="flex flex-col gap-2" aria-labelledby="parallel-summary-title">
            <h3 id="parallel-summary-title" class="text-sm font-medium">Paralelos registrados</h3>
            <div class="overflow-hidden rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Paralelo</TableHead><TableHead>Jornada</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableEmpty v-if="parallels.length === 0" :colspan="2">Sin paralelos registrados</TableEmpty>
                  <TableRow v-for="parallel in parallels" v-else :key="parallel.id">
                    <TableCell>{{ parallel.code }}</TableCell>
                    <TableCell>{{ shiftLabel(parallel.shift) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
          <FormSheetActions :close="close" :processing="saving" :icon="Plus" label="Crear paralelo" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
