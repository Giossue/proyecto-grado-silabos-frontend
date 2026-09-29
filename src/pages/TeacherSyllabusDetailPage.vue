<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  getTeacherSyllabus,
  saveTeacherField,
  startTeacherSyllabus,
  submitTeacherSyllabus,
  validateTeacherSyllabus,
  type SyllabusDetail,
  type SyllabusField,
} from "@/api/syllabi";
import SyllabusUnitAssistant from '@/components/domain/ai/SyllabusUnitAssistant.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import SyllabusAcademicContext from '@/components/domain/syllabus/SyllabusAcademicContext.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { freeTextPlain, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import { paths } from '@/lib/routes';
import { handleUnauthorized } from '@/lib/unauthorized';
import { hiddenKeys } from '@/lib/fieldConditions';
import { Send } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);
const savingFieldId = ref<string | null>(null);
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyFields = new Map<string, SyllabusField>();
let pendingSave: Promise<void> = Promise.resolve();
const validationResults = ref<Array<{
  field_id: string | null;
  code: string;
  severity: string;
  message: string;
}>>([]);
const validationRan = ref(false);
const validationBlockingErrors = ref<number | null>(null);
const conflict = ref(false);
const processingAction = ref(false);
const confirmSubmitOpen = ref(false);
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
const validationFor = (fieldId: string) =>
  validationResults.value.filter((result) => result.field_id === fieldId);
const visibleValidationMessages = (fieldId: string): string[] =>
  validationFor(fieldId).map((result) => result.message);
/** Dónde está cada parte en la página, para llevar al docente con un clic. */
const partTargets = computed(() => {
  const targets = new Map<string, string>();
  for (const section of syllabus.value?.sections ?? []) {
    for (const block of section.blocks) {
      for (const field of block.fields) {
        targets.set(field.id, usesTabularDocument(block) ? `block-${block.id}` : `field-${field.id}`);
      }
    }
  }
  return targets;
});
const blockingResults = computed(() => {
  const seen = new Set<string>();
  return validationResults.value
    .filter((result) => result.severity === "error")
    .filter((result) => {
      const key = `${result.field_id ?? ''}|${result.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
});
/** Partes de la página con al menos un error, en el orden en que aparecen. */
const partsWithErrors = computed(() => {
  const failing = new Set(blockingResults.value.map((result) => result.field_id));
  return [...partTargets.value.keys()].filter((id) => failing.has(id));
});
/** Errores que no pertenecen a ninguna parte visible (p. ej. datos de Coordinación). */
const orphanResults = computed(() =>
  blockingResults.value.filter((result) => !result.field_id || !partTargets.value.has(result.field_id)),
);
const blockErrors = (fields: SyllabusField[]): string[] =>
  [...new Set(fields.flatMap((field) => visibleValidationMessages(field.id)))];
/** Parte del docente que aún no tiene contenido; el envío se habilita cuando no queda ninguna. */
const isFieldEmpty = (field: SyllabusField): boolean => {
  if (field.type === "booleano") return typeof field.value !== "boolean";
  if (isFreeTextDocument(field.value)) return freeTextPlain(field.value).trim() === "";
  if (Array.isArray(field.value)) return field.value.length === 0;
  if (typeof field.value === "number") return false;
  return typeof field.value !== "string" || field.value.trim() === "";
};
const emptyParts = computed(() =>
  (syllabus.value?.sections ?? [])
    .flatMap((section) => section.blocks.flatMap((block) => block.fields))
    .filter((field) => field.teacher_editable && !field.inherited && !hiddenParts.value.has(field.key))
    .filter(isFieldEmpty).length,
);
const submitHint = computed(() => {
  if (emptyParts.value === 1) return "Falta 1 parte por completar";
  if (emptyParts.value > 1) return `Faltan ${emptyParts.value} partes por completar`;
  return "";
});
const goToPart = (fieldId: string | null): void => {
  const target = fieldId ? document.getElementById(partTargets.value.get(fieldId) ?? `field-${fieldId}`) : null;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.querySelector<HTMLElement>("input, textarea, button, [contenteditable='true']")?.focus({ preventScroll: true });
};
/** El aviso rojo de una parte se quita apenas el docente la cambia. */
const clearFieldValidation = (fieldId: string): void => {
  if (validationResults.value.some((result) => result.field_id === fieldId)) {
    validationResults.value = validationResults.value.filter((result) => result.field_id !== fieldId);
  }
};
const hasUnsavedChanges = (): boolean => dirtyFields.size > 0;

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
    // Abrir el sílabo es empezar a llenarlo: el borrador se inicia solo, sin pantalla previa.
    if (canStart.value) await start();
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

// Tras guardar, la validación anterior deja de ser la última palabra, pero la lista de
// partes pendientes se conserva: cada aviso se quita al corregir su parte.
const invalidateValidation = (): void => {
  validationRan.value = false;
  validationBlockingErrors.value = null;
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
  clearFieldValidation(field.id);
  scheduleSave(field);
};

const toggleBoolean = (field: SyllabusField, checked: boolean): void => {
  (field as unknown as { value: boolean }).value = checked;
  clearFieldValidation(field.id);
  scheduleSave(field);
};

const scalarValue = (field: SyllabusField): string | number =>
  typeof field.value === "string" || typeof field.value === "number"
    ? field.value
    : "";

const masterValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Pendiente de Coordinación';
  if (typeof value !== 'object') return typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (isFreeTextDocument(value)) return freeTextPlain(value);
  // Solo los valores: las claves internas no se muestran.
  return Object.values(value)
    .map((item) => String(item ?? '—'))
    .join(' · ');
};

const updateScalar = (field: SyllabusField, value: string): void => {
  field.value = field.type === "numero" && value !== "" ? Number(value) : value;
  clearFieldValidation(field.id);
  scheduleSave(field);
};

/**
 * Una parte con hoja propia se llena sobre esa hoja: su texto fijo, sus datos y sus
 * !Docente se ven juntos, igual que en el Word (I-155). La ficha de identificación
 * mantiene su formulario.
 */
const usesTabularDocument = (block: { content_type: string; document?: DocumentNode | null }): block is { content_type: string; document: DocumentNode } =>
  block.content_type !== 'institutional' && block.document != null;

/**
 * «Mostrar solo si»: partes ocultas mientras su condición no se cumple. Solo se
 * ocultan; el valor ya escrito no se borra y vuelve a verse al cumplirse.
 */
const hiddenParts = computed(() => hiddenKeys(
  (syllabus.value?.sections ?? []).flatMap((section) => section.blocks.flatMap((block) => block.fields)),
));
const designFields = (fields: SyllabusField[]): DocumentField[] => fields.map((field) => ({
  ...field,
  hidden: hiddenParts.value.has(field.key),
}));
const updateDesignValue = (fields: SyllabusField[], key: string, value: string | number | boolean | string[] | DocumentNode): void => {
  const field = fields.find((item) => item.key === key);
  if (field) { field.value = value; clearFieldValidation(field.id); scheduleSave(field); }
};
const flushAutosave = async (): Promise<boolean> => {
  if (canEdit.value && !conflict.value) {
    for (const field of Array.from(dirtyFields.values())) saveField(field);
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

const confirmSubmit = (): void => {
  confirmSubmitOpen.value = false;
  void submit();
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
    validationResults.value = [];
  } catch (reason) {
    // El servidor valida al enviar; si rechaza por errores bloqueantes, se piden los
    // resultados para marcar los campos y listar los errores.
    if (reason instanceof ApiError && reason.status === 422 && reason.errors.validation) {
      try {
        await runValidation();
        // Sin avisos arriba: se lleva al docente a la primera parte marcada en rojo.
        // Lo que no pertenece a ninguna parte (p. ej. «Avise a Coordinación») va al aviso de error.
        await nextTick();
        goToPart(partsWithErrors.value[0] ?? null);
        if (orphanResults.value.length) error.value = orphanResults.value.map((result) => result.message).join(" ");
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

/** Numera la sección como en el documento, salvo que el título ya traiga número. */
const sectionHeading = (title: string, index: number): string =>
  /^\s*\d+[.)]/.test(title) ? title : `${index + 1}. ${title}`;

const visibleSections = computed(() => syllabus.value?.sections ?? []);

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
});
</script>

<template>
  <PageFrame
    title=""
    :description="syllabus ? `${syllabus.code} · ${syllabus.convocation} · Paralelo(s) ${syllabus.parallels.join(', ')}` : 'Complete las partes del sílabo institucional.'"
  >
    <template #actions>
      <span v-if="saveFailed && canEdit" class="save-status flex items-center gap-2 text-sm text-destructive">Sin guardar<Button type="button" size="sm" variant="outline" :disabled="conflict" @click="retrySave">Reintentar</Button></span>
      <span v-if="syllabus && canEdit" class="flex items-center gap-2"><span v-if="submitHint" class="submit-hint text-xs text-muted-foreground">{{ submitHint }}</span><Button :disabled="processingAction || conflict || emptyParts > 0" :title="submitHint || undefined" @click="confirmSubmitOpen = true"><Spinner v-if="processingAction" /><Send v-else aria-hidden="true" />Enviar sílabo</Button></span>
    </template>

    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="(!syllabus || canStart) && !error" variant="syllabus" />

    <template v-if="syllabus">
      <Alert v-if="editBlockReason && ['sin_iniciar', 'borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked"><AlertTitle>Edición no disponible</AlertTitle><AlertDescription>{{ editBlockReason }}</AlertDescription></Alert>

      <Alert v-if="syllabus.state === 'correccion_solicitada'"><AlertTitle>Está preparando una nueva revisión</AlertTitle><AlertDescription>Modifique el trabajo y responda las observaciones seleccionadas antes de reenviar.</AlertDescription></Alert>

      <div v-if="syllabus.state !== 'sin_iniciar'" class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
        <main class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
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
            <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ sectionHeading(section.title, sectionIndex) }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
            <SyllabusAcademicContext v-if="section.blocks.some((block) => block.content_type === 'institutional')" :variables="syllabus.template_variables ?? {}" />

            <FieldSet v-for="block in section.blocks" :id="`block-${block.id}`" :key="block.id" class="scroll-mt-6 gap-5">
              <!-- Una parte con hoja no muestra el nombre de su pregunta: el título de la parte es lo único que ve el docente. -->
              <FieldLegend v-if="(block.title ?? '').trim() !== '' && section.blocks.length > 1 && (usesTabularDocument(block) || !(block.fields.length === 1 && block.title === block.fields[0]?.label))" :required="block.fields.length === 1 && block.fields[0]?.required">{{ block.title }}</FieldLegend>
              <TemplateDocumentView v-if="usesTabularDocument(block)" :document="block.document" :fields="designFields(block.fields)" :variables="syllabus.template_variables ?? {}" :editable="canEdit && !conflict" presentation="form" @value="(key, value) => updateDesignValue(block.fields, key, value)" />
              <FieldError v-if="usesTabularDocument(block)" class="block-errors" :errors="blockErrors(block.fields)" />
              <template v-if="!usesTabularDocument(block)">
                <FieldGroup>
                <template v-for="field in block.fields.filter((item) => !hiddenParts.has(item.key) && (block.content_type !== 'institutional' || (item.teacher_editable && !item.inherited)))" :key="field.id">
                <Field v-if="canEdit && field.teacher_editable && !field.inherited && ['texto_corto', 'numero', 'fecha'].includes(field.type)" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Input :id="`input-${field.id}`" :model-value="scalarValue(field)" :type="field.type === 'fecha' ? 'date' : field.type === 'numero' ? 'number' : 'text'" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'texto_libre'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><FreeTextEditor :id="`input-${field.id}`" :label="field.label.trim() || section.title" :model-value="isFreeTextDocument(field.value) ? field.value : null" @update:model-value="updateDesignValue([field], field.key, $event)" />
                </Field>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'texto_largo'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Textarea :id="`input-${field.id}`" :model-value="scalarValue(field)" class="min-h-32" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'seleccion_unica'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><Select :model-value="String(scalarValue(field))" @update:model-value="updateScalar(field, String($event))"><SelectTrigger :id="`input-${field.id}`"><SelectValue placeholder="Seleccione una opción" /></SelectTrigger><SelectContent><SelectItem v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select>
                </Field>

                <FieldSet v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'seleccion_multiple'" :id="`field-${field.id}`" :aria-required="field.required"><FieldLegend class="text-sm" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLegend><Field v-for="option in field.options" :key="option.value" orientation="horizontal"><Checkbox :id="`field-${field.id}-${option.value}`" :model-value="selectedValues(field).includes(option.value)" @update:model-value="toggleChoice(field, option.value, Boolean($event))" /><FieldLabel :for="`field-${field.id}-${option.value}`">{{ option.label }}</FieldLabel></Field></FieldSet>

                <Field v-else-if="canEdit && field.teacher_editable && !field.inherited && field.type === 'booleano'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0"><FieldLabel :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><div class="boolean-options flex gap-2" role="radiogroup" :aria-label="field.label.trim() || section.title"><Button type="button" size="sm" :variant="field.value === true ? 'default' : 'outline'" role="radio" :aria-checked="field.value === true" @click="toggleBoolean(field, true)">Sí</Button><Button type="button" size="sm" :variant="field.value === false ? 'default' : 'outline'" role="radio" :aria-checked="field.value === false" @click="toggleBoolean(field, false)">No</Button></div><FieldDescription>Seleccione una respuesta.</FieldDescription></Field>


                <div v-else :id="`field-${field.id}`" class="syllabus-readonly-field rounded-md border bg-muted/30 p-4"><div v-if="field.label.trim() || field.inherited" class="mb-2 flex flex-wrap items-center gap-2 font-medium">{{ field.label }}<Badge v-if="field.inherited" variant="outline">Dato automático</Badge></div><span>{{ masterValue(field.value) }}</span></div>
                <FieldError :errors="visibleValidationMessages(field.id)" />
                </template>
                </FieldGroup>
              </template>
            </FieldSet>
          </section>

        </main>

        <aside class="min-w-0 self-start xl:fixed xl:right-4 xl:top-32 xl:h-[calc(100dvh-9rem)] xl:w-[28rem] xl:max-w-[calc(100vw-2rem)]" aria-label="Asistente de unidades">
          <SyllabusUnitAssistant
            :syllabus-id="syllabus.id"
            :enabled="canEdit && !conflict"
            :saving="processingAction || savingFieldId !== null || hasUnsavedChanges()"
          />
        </aside>
      </div>
    </template>

    <Dialog v-model:open="confirmSubmitOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Enviar a Coordinación?</DialogTitle>
          <DialogDescription>Coordinación revisará el sílabo. Mientras lo revisa, no podrá hacer cambios.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="confirmSubmitOpen = false">Cancelar</Button>
          <Button type="button" :disabled="processingAction || conflict" @click="confirmSubmit">Enviar a Coordinación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageFrame>
</template>
