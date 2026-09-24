<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  getTeacherSyllabus,
  saveTeacherField,
  saveTeacherRows,
  startTeacherSyllabus,
  submitTeacherSyllabus,
  validateTeacherSyllabus,
  type SyllabusDetail,
  type SyllabusField,
} from "@/api/syllabi";
import SyllabusAiAssistantSheet from '@/components/domain/ai/SyllabusAiAssistantSheet.vue';
import SyllabusTableEditor from '@/components/domain/syllabus/SyllabusTableEditor.vue';
import SyllabusTableView from '@/components/domain/syllabus/SyllabusTableView.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import IdentificationCard from '@/components/domain/syllabus/IdentificationCard.vue';
import SyllabusAcademicContext from '@/components/domain/syllabus/SyllabusAcademicContext.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import type { TableRowData } from '@/lib/tableLayout';
import { paths } from '@/lib/routes';
import { handleUnauthorized } from '@/lib/unauthorized';

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);
const savingFieldId = ref<string | null>(null);
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const rowSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyFields = new Map<string, SyllabusField>();
const dirtyRows = new Map<string, SyllabusField>();
let pendingSave: Promise<void> = Promise.resolve();
const validationResults = ref<Array<{
  field_id: string | null;
  code: string;
  severity: string;
  message: string;
}>>([]);
const validationRan = ref(false);
const validationBlockingErrors = ref<number | null>(null);
const aiMessage = ref<string | null>(null);
const aiAssistant = ref<InstanceType<typeof SyllabusAiAssistantSheet> | null>(null);
const conflict = ref(false);
const processingAction = ref(false);
/** Motivo local de bloqueo: un guardado rechazado con 403 (p. ej. la convocatoria se pausó). */
const localBlockReason = ref<string | null>(null);
/** Hay cambios que no llegaron al servidor tras un fallo; se ofrecen para reintentar. */
const saveFailed = ref(false);
const PAUSED_MESSAGE = "La convocatoria está en pausa. Podrá seguir editando cuando se reanude.";

const editBlockReason = computed<string | null>(() =>
  localBlockReason.value ??
  (syllabus.value?.editable === false
    ? syllabus.value.edit_block_reason ?? "El sílabo no admite cambios en este momento."
    : null),
);
const canEdit = computed(() =>
  ["borrador", "correccion_solicitada"].includes(syllabus.value?.state ?? "") &&
  editBlockReason.value === null,
);
const canStart = computed(() =>
  syllabus.value?.state === "sin_iniciar" && editBlockReason.value === null,
);
// La revisión con IA no depende de una validación previa: el servidor valida al enviar.
const canReviewWithAi = computed(() => canEdit.value && !conflict.value);
const validationFor = (fieldId: string) =>
  validationResults.value.filter((result) => result.field_id === fieldId);
const visibleValidationMessages = (fieldId: string): string[] =>
  validationFor(fieldId).map((result) => result.message);
const blockingMessages = computed(() =>
  Array.from(new Set(
    validationResults.value
      .filter((result) => result.severity === "error")
      .map((result) => result.message),
  )),
);
const hasUnsavedChanges = (): boolean => dirtyFields.size > 0 || dirtyRows.size > 0;

const requestedObservations = computed(() =>
  (syllabus.value?.observations ?? []).filter(
    (observation) => observation.requested && observation.state !== 'verificada',
  ),
);

const syllabusId = (): string => String(route.params.syllabus);

const load = async (): Promise<void> => {
  try {
    syllabus.value = (await getTeacherSyllabus(syllabusId())).syllabus;
    validationRan.value = Boolean(syllabus.value.validation && syllabus.value.validation.version_bloqueo === syllabus.value.version_bloqueo);
    validationBlockingErrors.value = syllabus.value.validation?.blocking_errors ?? null;
    validationResults.value = syllabus.value.validation?.results ?? [];
    conflict.value = false;
    error.value = null;
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) {
      await router.replace(paths.login);
      return;
    }
    if (reason instanceof ApiError && reason.status === 404) {
      await router.replace(paths.teacher.syllabi);
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : "No se pudo cargar el sílabo.";
  }
};

const start = async (): Promise<void> => {
  if (!canStart.value) return;
  starting.value = true;
  error.value = null;
  try {
    syllabus.value = (await startTeacherSyllabus(syllabusId())).syllabus;
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 403) {
      localBlockReason.value = PAUSED_MESSAGE;
      return;
    }
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo iniciar el borrador.";
  } finally {
    starting.value = false;
  }
};

const invalidateValidation = (): void => {
  validationRan.value = false;
  validationBlockingErrors.value = null;
  validationResults.value = [];
};

const handleSaveFailure = (reason: unknown): void => {
  saveFailed.value = true;
  if (reason instanceof ApiError && (reason.status === 401 || reason.status === 419)) {
    handleUnauthorized(router);
    error.value = "Su sesión caducó. Inicie sesión de nuevo para guardar los cambios pendientes.";
    return;
  }
  if (reason instanceof ApiError && reason.status === 409) {
    conflict.value = true;
    error.value =
      "El borrador cambió en otra sesión. Recárguelo antes de continuar para evitar sobrescribir cambios.";
    return;
  }
  if (reason instanceof ApiError && reason.status === 403) {
    localBlockReason.value = PAUSED_MESSAGE;
    return;
  }
  error.value =
    reason instanceof ApiError
      ? reason.message
      : "No se pudo guardar el cambio.";
};

/**
 * Encola un guardado. Si falla (o ya no se puede escribir), el campo vuelve a quedar
 * pendiente para que «Reintentar» o la salida de la página lo vuelvan a enviar.
 */
const queueSave = (markPending: () => void, operation: () => Promise<void>): void => {
  pendingSave = pendingSave.then(async () => {
    if (conflict.value || !canEdit.value) {
      markPending();
      return;
    }
    try {
      await operation();
    } catch (reason) {
      markPending();
      handleSaveFailure(reason);
    }
  });
};

const saveField = (field: SyllabusField): void => {
  dirtyFields.delete(field.id);
  const timer = saveTimers.get(field.id);
  if (timer) clearTimeout(timer);
  saveTimers.delete(field.id);
  queueSave(() => { if (!dirtyFields.has(field.id)) dirtyFields.set(field.id, field); }, async () => {
    if (!syllabus.value) return;
    savingFieldId.value = field.id;
    try {
      const saved = await saveTeacherField(
        syllabus.value.id,
        field.id,
        syllabus.value.version_bloqueo,
        field.value,
      );
      syllabus.value.version_bloqueo = saved.version_bloqueo;
      invalidateValidation();
      if (!hasUnsavedChanges()) saveFailed.value = false;
    } finally {
      savingFieldId.value = null;
    }
  });
};

const scheduleSave = (field: SyllabusField): void => {
  if (!canEdit.value || conflict.value) return;
  const previous = saveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  dirtyFields.set(field.id, field);
  saveTimers.set(
    field.id,
    setTimeout(() => saveField(field), 700),
  );
};

const selectedValues = (field: SyllabusField): string[] => {
  const value = (field as unknown as { value: unknown }).value;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const toggleChoice = (
  field: SyllabusField,
  value: string,
  checked: boolean,
): void => {
  const next = checked
    ? Array.from(new Set([...selectedValues(field), value]))
    : selectedValues(field).filter((item) => item !== value);
  (field as unknown as { value: string[] }).value = next;
  scheduleSave(field);
};

const toggleBoolean = (field: SyllabusField, checked: boolean): void => {
  (field as unknown as { value: boolean }).value = checked;
  scheduleSave(field);
};

const scalarValue = (field: SyllabusField): string | number =>
  typeof field.value === "string" || typeof field.value === "number"
    ? field.value
    : "";

const masterValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Dato no disponible';
  if (typeof value !== 'object') return typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
  if (Array.isArray(value)) return value.map(String).join(', ');
  return Object.entries(value)
    .map(([key, item]) => `${key.replaceAll('_', ' ')}: ${String(item ?? '—')}`)
    .join(' · ');
};

const updateScalar = (field: SyllabusField, value: string): void => {
  field.value = field.type === "numero" && value !== "" ? Number(value) : value;
  scheduleSave(field);
};

const usesTabularDocument = (block: { content_type: string; document?: DocumentNode | null }): block is { content_type: string; document: DocumentNode } =>
  ['table', 'fixed'].includes(block.content_type) && block.document != null;

const designFields = (fields: SyllabusField[]): DocumentField[] => fields.map((field) => ({
  ...field,
  rows: field.rows.map((row) => ({ id: row.id ?? null, data: row.data })),
}));
const tableRows = (field: SyllabusField): Array<{ id: string | null; data: TableRowData }> =>
  field.rows.map((row) => ({ id: row.id ?? null, data: row.data }));
const updateDesignValue = (fields: SyllabusField[], key: string, value: string | number | boolean): void => {
  const field = fields.find((item) => item.key === key);
  if (field) { field.value = value; scheduleSave(field); }
};
const updateDesignRows = (fields: SyllabusField[], key: string, rows: Array<{ id: string | null; data: TableRowData }>): void => {
  const field = fields.find((item) => item.key === key);
  if (field) { field.rows = rows.map((row, index) => ({ id: row.id ?? undefined, data: row.data as Record<string, string | number | null>, position: index + 1 })); scheduleRows(field); }
};

const updateRows = (field: SyllabusField, rows: Array<{ id?: string | null; data: TableRowData; position?: number }>): void => {
  field.rows = rows.map((row, index) => ({ id: row.id ?? undefined, data: row.data as Record<string, string | number | null>, position: row.position ?? index + 1 }));
  scheduleRows(field);
};

const saveRows = (field: SyllabusField): void => {
  dirtyRows.delete(field.id);
  const timer = rowSaveTimers.get(field.id);
  if (timer) clearTimeout(timer);
  rowSaveTimers.delete(field.id);
  queueSave(() => { if (!dirtyRows.has(field.id)) dirtyRows.set(field.id, field); }, async () => {
    if (!syllabus.value) return;
    savingFieldId.value = field.id;
    try {
      const saved = await saveTeacherRows(
        syllabus.value.id,
        field.id,
        syllabus.value.version_bloqueo,
        field.rows.map((row) => ({ ...row, id: row.id || undefined })),
      );
      field.rows = saved.rows;
      syllabus.value.version_bloqueo = saved.version_bloqueo;
      invalidateValidation();
      if (!hasUnsavedChanges()) saveFailed.value = false;
    } finally {
      savingFieldId.value = null;
    }
  });
};

const scheduleRows = (field: SyllabusField): void => {
  if (!canEdit.value || conflict.value) return;
  const previous = rowSaveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  dirtyRows.set(field.id, field);
  rowSaveTimers.set(
    field.id,
    setTimeout(() => saveRows(field), 700),
  );
};

const flushAutosave = async (): Promise<boolean> => {
  if (canEdit.value && !conflict.value) {
    for (const field of Array.from(dirtyFields.values())) saveField(field);
    for (const field of Array.from(dirtyRows.values())) saveRows(field);
  }
  await pendingSave;
  if (!hasUnsavedChanges()) saveFailed.value = false;

  return !conflict.value && !hasUnsavedChanges();
};

const retrySave = async (): Promise<void> => {
  error.value = null;
  await flushAutosave();
};

const runValidation = async (): Promise<void> => {
  if (!syllabus.value) return;
  const { validation } = await validateTeacherSyllabus(syllabus.value.id);
  validationResults.value = validation.results;
  validationBlockingErrors.value = validation.blocking_errors;
  validationRan.value = true;
};

const submit = async (): Promise<void> => {
  if (!syllabus.value) return;
  try {
    processingAction.value = true;
    error.value = null;
    if (!(await flushAutosave())) return;
    syllabus.value = (
      await submitTeacherSyllabus(
        syllabus.value.id,
        syllabus.value.version_bloqueo,
      )
    ).syllabus;
    invalidateValidation();
  } catch (reason) {
    // El servidor valida al enviar; si rechaza por errores bloqueantes, se piden los
    // resultados para marcar los campos y listar los errores.
    if (reason instanceof ApiError && reason.status === 422 && reason.errors.validation) {
      try {
        await runValidation();
        return;
      } catch {
        // Si la consulta de detalle falla, al menos queda el mensaje del envío.
      }
    }
    if (reason instanceof ApiError && reason.status === 403) {
      localBlockReason.value = PAUSED_MESSAGE;
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : "No se pudo enviar el sílabo.";
  } finally {
    processingAction.value = false;
  }
};

const visibleSections = computed(() => syllabus.value?.sections ?? []);

const recommendationApplied = (payload: {
  fieldId: string;
  value: string;
  version: number;
}): void => {
  if (!syllabus.value) return;
  const field = syllabus.value.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.fields)
    .find((item) => item.id === payload.fieldId);
  if (field) field.value = payload.value;
  syllabus.value.version_bloqueo = payload.version;
  invalidateValidation();
};

const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!hasUnsavedChanges() && savingFieldId.value === null) return;
  event.preventDefault();
  event.returnValue = "";
};

onMounted(() => {
  window.addEventListener("beforeunload", warnBeforeUnload);
  void load();
});
// Al salir se envía lo pendiente en lugar de descartarlo; solo si no se pudo guardar
// se pide confirmación para no perder cambios en silencio.
onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges()) {
    await pendingSave;
    if (!hasUnsavedChanges()) return true;
  }
  if (await flushAutosave()) return true;

  return window.confirm("Hay cambios sin guardar. ¿Desea salir de todos modos?");
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", warnBeforeUnload);
  saveTimers.forEach((timer) => clearTimeout(timer));
  rowSaveTimers.forEach((timer) => clearTimeout(timer));
});
</script>

<template>
  <PageFrame
    title=""
    :description="syllabus ? `${syllabus.code} · ${syllabus.convocation} · Paralelo(s) ${syllabus.parallels.join(', ')}` : 'Complete los campos del sílabo institucional.'"
  >
    <template #actions>
      <span v-if="saveFailed && canEdit" class="save-status flex items-center gap-2 text-sm text-destructive">Sin guardar<Button type="button" size="sm" variant="outline" :disabled="conflict" @click="retrySave">Reintentar</Button></span>
      <Button v-if="canStart" :disabled="starting" @click="start"><Spinner v-if="starting" />{{ starting ? 'Iniciando…' : 'Iniciar borrador' }}</Button>
      <Button v-else-if="syllabus && canEdit" :disabled="processingAction || conflict" @click="submit"><Spinner v-if="processingAction" />Enviar sílabo</Button>
    </template>

    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="!syllabus && !error" variant="syllabus" />

    <template v-if="syllabus">
      <Alert v-if="editBlockReason && ['sin_iniciar', 'borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked"><AlertTitle>Edición no disponible</AlertTitle><AlertDescription>{{ editBlockReason }}</AlertDescription></Alert>
      <Card v-if="canStart"><CardHeader><CardTitle>Listo para iniciar</CardTitle><CardDescription>Inicie el borrador para completar los campos de la plantilla institucional.</CardDescription></CardHeader><CardContent><Button :disabled="starting" @click="start">{{ starting ? 'Iniciando…' : 'Iniciar borrador' }}</Button></CardContent></Card>

      <Alert v-if="syllabus.state === 'correccion_solicitada'"><AlertTitle>Está preparando una nueva revisión</AlertTitle><AlertDescription>Modifique el trabajo y responda las observaciones seleccionadas antes de reenviar.</AlertDescription></Alert>
      <Alert v-if="validationRan" :variant="validationBlockingErrors && validationBlockingErrors > 0 ? 'destructive' : 'default'"><AlertTitle>Validación del sílabo</AlertTitle><AlertDescription class="flex flex-col gap-2"><span>{{ validationBlockingErrors && validationBlockingErrors > 0 ? `Se encontraron ${validationBlockingErrors} error(es) bloqueante(s). Corríjalos antes de enviar.` : 'No hay errores bloqueantes. Las sugerencias de IA son opcionales.' }}</span><ul v-if="validationBlockingErrors && blockingMessages.length" class="validation-errors list-disc pl-5"><li v-for="message in blockingMessages" :key="message">{{ message }}</li></ul></AlertDescription></Alert>
      <Alert v-if="aiMessage"><AlertDescription>{{ aiMessage }}</AlertDescription></Alert>

      <div v-if="syllabus.state !== 'sin_iniciar'" class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
        <main class="flex min-w-0 flex-col gap-8">
          <Card v-if="!canEdit" class="syllabus-document-header">
            <CardContent class="flex flex-col items-center gap-5 py-8 text-center">
              <div class="flex w-full items-center justify-between gap-6"><img :src="syllabus.presentation.logos.institution" alt="Logo institucional" class="max-h-10 max-w-40 object-contain" /><img :src="syllabus.presentation.logos.faculty" alt="Logo de facultad" class="max-h-14 max-w-40 object-contain" /></div>
              <h1 class="text-xl font-semibold" :style="{ color: syllabus.presentation.appearance.accent_color }">{{ syllabus.presentation.title }}</h1>
              <p class="text-sm text-muted-foreground">Esta versión es de solo lectura.</p>
            </CardContent>
          </Card>

          <DocumentSignatureCard v-if="syllabus.state === 'aprobado' && syllabus.approved_revision_id" :revision-id="syllabus.approved_revision_id" :file-name="`silabo-${syllabus.code}`" />

          <Card v-if="requestedObservations.length">
            <CardHeader><CardTitle>Observaciones de coordinación</CardTitle><CardDescription>Corrija lo indicado en el sílabo y reenvíelo para una nueva revisión.</CardDescription></CardHeader>
            <CardContent class="flex flex-col gap-4">
              <article v-for="observation in requestedObservations" :key="observation.id" class="flex flex-col gap-3 rounded-md border p-4"><div class="flex flex-wrap gap-2"><Badge variant="outline">Revisión {{ observation.revision_number ?? 'actual' }}</Badge></div><p class="text-sm whitespace-pre-wrap">{{ observation.content }}</p></article>
            </CardContent>
          </Card>

          <section v-for="(section, sectionIndex) in visibleSections" :id="`section-${section.id}`" :key="section.id" class="flex scroll-mt-6 flex-col gap-6 border-t pt-8 first:border-t-0 first:pt-0">
            <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ section.title }}</h2><p class="text-sm text-muted-foreground">{{ section.description ?? 'Complete los campos aplicables.' }}</p></header>
            <IdentificationCard v-if="sectionIndex === 0 && syllabus.identification.length" :grid="syllabus.identification" />

            <FieldSet v-for="block in section.blocks" :key="block.id" class="gap-5">
              <FieldLegend v-if="section.blocks.length > 1 && !(block.fields.length === 1 && block.title === block.fields[0]?.label)" :required="block.fields.length === 1 && block.fields[0]?.required">{{ block.title }}</FieldLegend>
              <SyllabusAcademicContext v-if="block.content_type === 'institutional'" :variables="syllabus.template_variables ?? {}" />
              <TemplateDocumentView v-if="usesTabularDocument(block)" :document="block.document" :fields="designFields(block.fields)" :variables="syllabus.template_variables ?? {}" :layout="block.table" :editable="canEdit && !conflict" presentation="form" :planning-expectations="syllabus.planning_expectations ?? null" @value="(key, value) => updateDesignValue(block.fields, key, value)" @rows="(key, rows) => updateDesignRows(block.fields, key, rows)" />
              <template v-if="!usesTabularDocument(block)">
                <FieldGroup>
                <template v-for="field in block.fields.filter((item) => block.content_type !== 'institutional' || (item.teacher_editable && !item.inherited))" :key="field.id">
                <Field v-if="canEdit && field.teacher_editable && !field.inherited && ['texto_corto', 'numero', 'fecha'].includes(field.type)" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required">{{ field.label }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Input :id="`input-${field.id}`" :model-value="scalarValue(field)" :type="field.type === 'fecha' ? 'date' : field.type === 'numero' ? 'number' : 'text'" :disabled="savingFieldId === field.id" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'texto_largo'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required">{{ field.label }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Textarea :id="`input-${field.id}`" :model-value="scalarValue(field)" class="min-h-32" :disabled="savingFieldId === field.id" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'seleccion_unica'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required">{{ field.label }}</FieldLabel><Select :model-value="String(scalarValue(field))" @update:model-value="updateScalar(field, String($event))"><SelectTrigger :id="`input-${field.id}`"><SelectValue placeholder="Seleccione una opción" /></SelectTrigger><SelectContent><SelectItem v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select>
                </Field>

                <FieldSet v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'seleccion_multiple'" :id="`field-${field.id}`" :aria-required="field.required"><FieldLegend class="text-sm" :required="field.required">{{ field.label }}</FieldLegend><Field v-for="option in field.options" :key="option.value" orientation="horizontal"><Checkbox :id="`field-${field.id}-${option.value}`" :model-value="selectedValues(field).includes(option.value)" @update:model-value="toggleChoice(field, option.value, Boolean($event))" /><FieldLabel :for="`field-${field.id}-${option.value}`">{{ option.label }}</FieldLabel></Field></FieldSet>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'booleano'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0"><FieldLabel :required="field.required">{{ field.label }}</FieldLabel><div class="boolean-options flex gap-2" role="radiogroup" :aria-label="field.label"><Button type="button" size="sm" :variant="field.value === true ? 'default' : 'outline'" role="radio" :aria-checked="field.value === true" @click="toggleBoolean(field, true)">Sí</Button><Button type="button" size="sm" :variant="field.value === false ? 'default' : 'outline'" role="radio" :aria-checked="field.value === false" @click="toggleBoolean(field, false)">No</Button></div><FieldDescription>Seleccione una respuesta.</FieldDescription></Field>

                <div v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'repetible'" :id="`field-${field.id}`" class="flex flex-col gap-2"><template v-if="!block.table"><p class="text-sm font-medium">{{ field.label }}</p><p class="text-sm text-muted-foreground">Esta tabla no tiene una estructura configurada.</p></template><template v-else><SyllabusTableEditor :field-id="field.id" :label="field.label" :layout="block.table" :rows="tableRows(field)" :required="field.required" :invalid="validationFor(field.id).length > 0" :planning-expectations="syllabus.planning_expectations ?? null" @update:rows="updateRows(field, $event)" /><span v-if="savingFieldId === field.id" class="text-xs text-muted-foreground">Guardando…</span></template></div>

                <div v-else :id="`field-${field.id}`" class="syllabus-readonly-field rounded-md border bg-muted/30 p-4"><div class="mb-2 flex flex-wrap items-center gap-2 font-medium">{{ field.label }}<Badge v-if="field.inherited" variant="outline">Institucional · solo lectura</Badge></div><SyllabusTableView v-if="field.type === 'repetible' && block.table" :layout="block.table" :rows="tableRows(field)" :planning-expectations="syllabus.planning_expectations ?? null" /><span v-else>{{ masterValue(field.value) }}</span></div>
                <FieldError :errors="visibleValidationMessages(field.id)" />
                </template>
                </FieldGroup>
              </template>
            </FieldSet>
          </section>

        </main>

        <aside class="min-w-0 self-start xl:fixed xl:right-4 xl:top-32 xl:bottom-4 xl:w-[28rem] xl:max-w-[calc(100vw-2rem)]" aria-label="Asistente IA">
          <SyllabusAiAssistantSheet
            ref="aiAssistant"
            :syllabus-id="syllabus.id"
            :syllabus-version="syllabus.version_bloqueo"
            :can-review="canReviewWithAi"
            :saving="processingAction || savingFieldId !== null"
            @recommendation-applied="recommendationApplied"
          />
        </aside>
      </div>
    </template>
  </PageFrame>
</template>
