<script setup lang="ts">
import { ArrowDown, ArrowUp, Check, RotateCw, Trash2 } from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import {
  getSubjectLearningOutcomes,
  PURGE_CANCELLED_MESSAGE,
  saveSubjectLearningOutcomes,
  type SubjectLearningOutcomes,
} from "@/api/career-academics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { CurriculumBuilderSubject } from "@/types/academic";

const props = defineProps<{
  subject: Pick<CurriculumBuilderSubject, "id" | "code" | "name">;
}>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [message: string] }>();
type OutcomeDraft = { key: number; id?: string; text: string };

const form = reactive({
  source_name: "",
  source_locator: "",
  outcomes: [] as OutcomeDraft[],
});
const record = ref<SubjectLearningOutcomes | null>(null);
const loading = ref(false);
const saving = ref(false);
const confirmed = ref(false);
const stale = ref(false);
const loadError = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const message = ref<string | null>(null);
const editable = computed(() => Boolean(record.value?.editable && !record.value.lock_reason));
const controlsDisabled = computed(() => !editable.value || saving.value || stale.value);
let nextKey = 0;
let loadSequence = 0;

// La confirmación corresponde exactamente al contenido y orden revisados.
watch(form, () => { confirmed.value = false; }, { deep: true, flush: "sync" });

const load = async (): Promise<void> => {
  const sequence = ++loadSequence;
  loading.value = true;
  loadError.value = null;
  record.value = null;
  message.value = null;
  errors.value = {};
  confirmed.value = false;
  stale.value = false;
  try {
    const result = await getSubjectLearningOutcomes(props.subject.id);
    if (sequence !== loadSequence) return;
    form.source_name = result.source_name;
    form.source_locator = result.source_locator;
    form.outcomes = [...result.outcomes]
      .sort((left, right) => left.position - right.position)
      .map(({ id, text }) => ({ key: nextKey++, id, text }));
    record.value = result;
  } catch (reason) {
    if (sequence !== loadSequence) return;
    loadError.value = reason instanceof ApiError
      ? reason.message
      : "No se pudieron cargar los resultados de aprendizaje. Intente de nuevo.";
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
};

watch(
  () => [open.value, props.subject.id] as const,
  ([isOpen]) => {
    if (isOpen) void load();
    else loadSequence += 1;
  },
  { immediate: true },
);

const addOutcome = (): void => {
  if (controlsDisabled.value || form.outcomes.length >= 100) return;
  form.outcomes.push({ key: nextKey++, text: "" });
  errors.value = {};
};

const removeOutcome = (index: number): void => {
  if (controlsDisabled.value) return;
  form.outcomes.splice(index, 1);
  errors.value = {};
};

const moveOutcome = (index: number, direction: -1 | 1): void => {
  const destination = index + direction;
  if (controlsDisabled.value || destination < 0 || destination >= form.outcomes.length) return;
  const [outcome] = form.outcomes.splice(index, 1);
  if (outcome) form.outcomes.splice(destination, 0, outcome);
  errors.value = {};
};

const close = (): void => {
  if (!saving.value) open.value = false;
};

const submit = async (): Promise<void> => {
  if (controlsDisabled.value || !record.value) return;
  message.value = null;
  errors.value = {};
  if (!form.source_name.trim()) errors.value.source_name = ["Indique el nombre del documento fuente."];
  if (!form.source_locator.trim()) errors.value.source_locator = ["Indique la página, sección o ubicación del contenido."];
  if (form.outcomes.length === 0) errors.value.outcomes = ["Agregue al menos un resultado de aprendizaje."];
  form.outcomes.forEach((outcome, index) => {
    if (!outcome.text.trim()) errors.value[`outcomes.${index}.text`] = ["Escriba el resultado de aprendizaje o quite esta fila."];
  });
  if (!confirmed.value) errors.value.confirmed = ["Revise el contenido y confirme que coincide con la fuente."];
  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    const result = await saveSubjectLearningOutcomes(props.subject.id, {
      source_name: form.source_name.trim(),
      source_locator: form.source_locator.trim(),
      outcomes: form.outcomes.map(({ id, text }) => ({ ...(id ? { id } : {}), text: text.trim() })),
      confirmed: true,
      expected_fingerprint: record.value.fingerprint,
    });
    emit("saved", result.message);
    open.value = false;
  } catch (reason) {
    if (reason instanceof ApiError) {
      errors.value = reason.errors;
      message.value = reason.message;
      if (reason.status === 409 && reason.message !== PURGE_CANCELLED_MESSAGE && !reason.errors.purge_required) stale.value = true;
    } else {
      message.value = "No se pudieron guardar los resultados de aprendizaje. Intente de nuevo.";
    }
  } finally {
    saving.value = false;
  }
};

const confirmedDate = computed(() => record.value?.confirmed_at
  ? new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(record.value.confirmed_at))
  : null);
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) close(); }">
    <DialogContent
      class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
      @escape-key-down.prevent
    >
      <DialogHeader>
        <DialogTitle>Resultados de aprendizaje</DialogTitle>
        <DialogDescription>
          {{ subject.code }} · {{ subject.name }}. Registre los resultados de la materia y su procedencia para usarlos en el sílabo.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex flex-col gap-3" role="status" aria-label="Cargando resultados de aprendizaje">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>
      <Alert v-else-if="loadError" variant="destructive">
        <AlertDescription>{{ loadError }}</AlertDescription>
      </Alert>

      <form v-else-if="record" @submit.prevent="submit">
        <FieldGroup>
          <Alert v-if="record.lock_reason || !record.editable">
            <AlertDescription>{{ record.lock_reason ?? "Estos resultados están disponibles solo para consulta." }}</AlertDescription>
          </Alert>
          <Alert v-if="message" variant="destructive">
            <AlertDescription>{{ message }}</AlertDescription>
          </Alert>
          <p v-if="confirmedDate" class="text-sm text-muted-foreground">
            Última validación: {{ record.confirmed_by?.name ?? "Coordinación" }} · {{ confirmedDate }}.
          </p>

          <FieldSet :disabled="saving">
            <FieldLegend>Procedencia</FieldLegend>
            <FieldGroup class="gap-3">
              <Field :data-invalid="Boolean(errors.source_name)">
                <FieldLabel for="learning-outcomes-source" required>Documento fuente</FieldLabel>
                <Input id="learning-outcomes-source" v-model="form.source_name" placeholder="Ej. Proyecto de Carrera Actualizado" maxlength="240" :readonly="controlsDisabled" :aria-invalid="Boolean(errors.source_name)" required />
                <FieldError :errors="errors.source_name" />
              </Field>
              <Field :data-invalid="Boolean(errors.source_locator)">
                <FieldLabel for="learning-outcomes-locator" required>Ubicación en el documento</FieldLabel>
                <Input id="learning-outcomes-locator" v-model="form.source_locator" placeholder="Ej. Página 22, fila 40: Calidad de Software" maxlength="500" :readonly="controlsDisabled" :aria-invalid="Boolean(errors.source_locator)" required />
                <FieldError :errors="errors.source_locator" />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet :disabled="saving">
            <FieldLegend>Resultados de la materia</FieldLegend>
            <FieldDescription v-if="editable">Conserve el contenido de la fuente. El orden de esta lista se utiliza en el sílabo.</FieldDescription>
            <FieldError :errors="errors.outcomes" />
            <Empty v-if="form.outcomes.length === 0">
              <EmptyHeader>
                <EmptyTitle>Sin resultados registrados</EmptyTitle>
                <EmptyDescription>{{ editable ? "Agregue los resultados de aprendizaje de esta materia desde su documento fuente." : "La Coordinación aún no ha registrado resultados de aprendizaje para esta materia." }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
            <FieldGroup class="gap-4">
              <Field v-for="(outcome, index) in form.outcomes" :key="outcome.key" :data-invalid="Boolean(errors[`outcomes.${index}.text`] || errors[`outcomes.${index}.id`])">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel :for="`learning-outcome-${outcome.key}`" required>Resultado {{ index + 1 }}</FieldLabel>
                  <div v-if="editable" class="flex gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Subir resultado ${index + 1}`" :disabled="controlsDisabled || index === 0" @click="moveOutcome(index, -1)"><ArrowUp data-icon="inline-start" aria-hidden="true" /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Bajar resultado ${index + 1}`" :disabled="controlsDisabled || index === form.outcomes.length - 1" @click="moveOutcome(index, 1)"><ArrowDown data-icon="inline-start" aria-hidden="true" /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Quitar resultado ${index + 1}`" :disabled="controlsDisabled" @click="removeOutcome(index)"><Trash2 data-icon="inline-start" aria-hidden="true" /></Button>
                  </div>
                </div>
                <Textarea :id="`learning-outcome-${outcome.key}`" v-model="outcome.text" placeholder="Ej. Aplica estándares y métricas para evaluar la calidad del software." maxlength="12000" :readonly="controlsDisabled" :aria-invalid="Boolean(errors[`outcomes.${index}.text`] || errors[`outcomes.${index}.id`])" required />
                <FieldError :errors="errors[`outcomes.${index}.text`] ?? errors[`outcomes.${index}.id`]" />
              </Field>
            </FieldGroup>
            <Button v-if="editable" type="button" size="sm" variant="outline" class="self-start" :disabled="controlsDisabled || form.outcomes.length >= 100" @click="addOutcome">Agregar resultado</Button>
          </FieldSet>

          <Field v-if="editable" :data-invalid="Boolean(errors.confirmed)">
            <Field orientation="horizontal">
              <Checkbox id="learning-outcomes-confirmed" v-model="confirmed" :disabled="controlsDisabled" :aria-invalid="Boolean(errors.confirmed)" />
              <FieldLabel for="learning-outcomes-confirmed">Revisé los resultados y su orden contra la fuente indicada.</FieldLabel>
            </Field>
            <FieldError :errors="errors.confirmed" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="saving" @click="close">{{ editable ? "Cancelar" : "Cerrar" }}</Button>
            <Button v-if="editable" type="submit" :disabled="controlsDisabled || !confirmed">
              <Spinner v-if="saving" data-icon="inline-start" />
              <Check v-else data-icon="inline-start" aria-hidden="true" />
              Guardar y validar
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>

      <DialogFooter v-if="loading || loadError">
        <Button type="button" variant="outline" @click="close">Cerrar</Button>
        <Button v-if="loadError" type="button" @click="load"><RotateCw data-icon="inline-start" aria-hidden="true" />Reintentar carga</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
