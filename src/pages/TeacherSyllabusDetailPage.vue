<script setup lang="ts">
import CommentEntry from '@/components/domain/CommentEntry.vue';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import BooleanChoice from '@/components/domain/BooleanChoice.vue';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { useDiscardConfirmation } from '@/composables/useDiscardConfirmation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  getTeacherSyllabus,
  saveTeacherField,
  startTeacherSyllabus,
  copyTeacherSyllabus,
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
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Copy, Library, Send } from '@lucide/vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';

const { open: discardOpen, ask: askToDiscard, decide: decideDiscard } = useDiscardConfirmation();
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
const localBlockReason = ref<string | null>(null);
const copySource = ref<{ id: string; parallel: string } | null>(null);
const saveFailed = ref(false);
const PAUSED_MESSAGE = "La convocatoria está en pausa. Podrá seguir editando cuando se reanude.";
const LIBRARY_SECTION = "bibliografia";

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
const libraryCorrection = computed(() => syllabus.value?.library_correction === true);
const sectionEditable = (section: { key: string }): boolean =>
  canEdit.value && (!libraryCorrection.value || section.key === LIBRARY_SECTION);
const editableFieldIds = computed(() => new Set(
  (syllabus.value?.sections ?? [])
    .filter((section) => !libraryCorrection.value || section.key === LIBRARY_SECTION)
    .flatMap((section) => section.blocks.flatMap((block) => block.fields.map((field) => field.id))),
));
const libraryComments = computed(() =>
  [...(syllabus.value?.library_comments ?? [])].sort(
    (left, right) => new Date(right.commented_at).getTime() - new Date(left.commented_at).getTime(),
  ),
);
const latestLibraryComment = computed(() => libraryComments.value[0] ?? null);
const canStart = computed(() =>
  syllabus.value?.state === "sin_iniciar" && editBlockReason.value === null,
);
const validationFor = (fieldId: string) =>
  validationResults.value.filter((result) => result.field_id === fieldId);
const visibleValidationMessages = (fieldId: string): string[] =>
  validationFor(fieldId).map((result) => result.message);
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
const partsWithErrors = computed(() => {
  const failing = new Set(blockingResults.value.map((result) => result.field_id));
  return [...partTargets.value.keys()].filter((id) => failing.has(id));
});
const orphanResults = computed(() =>
  blockingResults.value.filter((result) => !result.field_id || !partTargets.value.has(result.field_id)),
);
const blockErrors = (fields: SyllabusField[]): string[] =>
  [...new Set(fields.flatMap((field) => visibleValidationMessages(field.id)))];
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
    .filter((field) => editableFieldIds.value.has(field.id))
    .filter((field) => field.teacher_editable && !field.inherited && !hiddenParts.value.has(field.key))
    .filter(isFieldEmpty).length,
);
const submitHint = computed(() => {
  if (emptyParts.value === 1) return "Falta 1 campo por completar";
  if (emptyParts.value > 1) return `Faltan ${emptyParts.value} campos por completar`;
  return "";
});
const goToPart = (fieldId: string | null): void => {
  const target = fieldId ? document.getElementById(partTargets.value.get(fieldId) ?? `field-${fieldId}`) : null;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.querySelector<HTMLElement>("input, textarea, button, [contenteditable='true']")?.focus({ preventScroll: true });
};
const clearFieldValidation = (fieldId: string): void => {
  if (validationResults.value.some((result) => result.field_id === fieldId)) {
    validationResults.value = validationResults.value.filter((result) => result.field_id !== fieldId);
  }
};
const hasUnsavedChanges = (): boolean => dirtyFields.size > 0;
const copySources = computed(() =>
  canEdit.value && syllabus.value?.state === "borrador" ? syllabus.value.copy_sources ?? [] : [],
);

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
  if (!canEdit.value || conflict.value || !editableFieldIds.value.has(field.id)) return;
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
  return Object.values(value)
    .map((item) => String(item ?? '—'))
    .join(' · ');
};

const updateScalar = (field: SyllabusField, value: string): void => {
  field.value = field.type === "numero" && value !== "" ? Number(value) : value;
  clearFieldValidation(field.id);
  scheduleSave(field);
};

const usesTabularDocument = (block: { content_type: string; document?: DocumentNode | null }): block is { content_type: string; document: DocumentNode } =>
  block.content_type !== 'institutional' && block.document != null;

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
    if (reason instanceof ApiError && reason.status === 422 && reason.errors.validation) {
      try {
        await runValidation();
        await nextTick();
        goToPart(partsWithErrors.value[0] ?? null);
        if (orphanResults.value.length) error.value = orphanResults.value.map((result) => result.message).join(" ");
        return;
      } catch {
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

const copyFromSource = async (): Promise<void> => {
  const source = copySource.value;
  copySource.value = null;
  if (!syllabus.value || !source) return;
  try {
    processingAction.value = true;
    error.value = null;
    if (!(await flushAutosave())) return;
    syllabus.value = (
      await copyTeacherSyllabus(syllabus.value.id, source.id, syllabus.value.version_bloqueo)
    ).syllabus;
    invalidateValidation();
    validationResults.value = [];
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 409) conflict.value = true;
    if (reason instanceof ApiError && reason.status === 403) {
      localBlockReason.value = PAUSED_MESSAGE;
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : "No se pudo copiar el sílabo.";
  } finally {
    processingAction.value = false;
  }
};

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
onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges()) {
    await pendingSave;
    if (!hasUnsavedChanges()) return true;
  }
  if (await flushAutosave()) return true;

  return askToDiscard();
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", warnBeforeUnload);
  saveTimers.forEach((timer) => clearTimeout(timer));
});
</script>

<template>
  <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-sm backdrop-blur sm:px-5" aria-label="Herramientas del sílabo">
    <Button variant="link" size="sm" class="h-auto px-0" as-child><RouterLink :to="paths.teacher.syllabi"><ArrowLeft aria-hidden="true" />Volver a mis sílabos</RouterLink></Button>
    <span class="flex-1" />
    <AppearanceToggle />
  </header>
  <PageFrame title="" description="">
    <template #actions>
      <span v-if="saveFailed && canEdit" class="save-status flex items-center gap-2 text-sm text-destructive">Sin guardar<Button type="button" size="sm" variant="outline" :disabled="conflict" @click="retrySave">Reintentar</Button></span>
      <Button v-for="source in copySources" :key="source.id" type="button" variant="outline" :disabled="processingAction || conflict" @click="copySource = source"><Copy aria-hidden="true" />Copiar desde paralelo {{ source.parallel }}</Button>
      <span v-if="syllabus && canEdit" class="flex items-center gap-2"><Tooltip><TooltipTrigger as-child><span class="inline-flex"><Button :disabled="processingAction || conflict || emptyParts > 0" @click="confirmSubmitOpen = true"><Spinner v-if="processingAction" /><Send v-else aria-hidden="true" />{{ libraryCorrection ? 'Reenviar bibliografía' : 'Enviar sílabo' }}</Button></span></TooltipTrigger><TooltipContent>{{ submitHint || 'Enviar la revisión del sílabo' }}</TooltipContent></Tooltip></span>
    </template>

    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="(!syllabus || canStart) && !error" variant="syllabus" />

    <template v-if="syllabus">
      <Alert v-if="editBlockReason && ['sin_iniciar', 'borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked"><AlertTitle>Edición no disponible</AlertTitle><AlertDescription>{{ editBlockReason }}</AlertDescription></Alert>

      <Alert v-if="syllabus.state === 'correccion_solicitada' && libraryCorrection" class="library-correction"><Library aria-hidden="true" /><AlertTitle>Biblioteca pidió corregir la bibliografía</AlertTitle><AlertDescription>Solo puede cambiar la sección Bibliografía. Los demás campos quedan como los aprobó coordinación.</AlertDescription></Alert>
      <Alert v-else-if="syllabus.state === 'correccion_solicitada'"><AlertTitle>Está preparando una nueva revisión</AlertTitle><AlertDescription>Modifique el trabajo y responda las observaciones seleccionadas antes de reenviar.</AlertDescription></Alert>

      <WorkspaceLayout v-if="syllabus.state !== 'sin_iniciar'" variant="syllabus">
        <main class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
          <Card v-if="!canEdit" class="syllabus-document-header">
            <CardContent class="flex flex-col items-center gap-5 py-8 text-center">
              <div class="flex w-full items-center justify-between gap-6"><img :src="syllabus.presentation.logos.institution" alt="Logo institucional" class="max-h-10 max-w-40 object-contain" /><img :src="syllabus.presentation.logos.faculty" alt="Logo de facultad" class="max-h-14 max-w-40 object-contain" /></div>
              <h1 class="text-xl font-semibold" :style="{ color: syllabus.presentation.appearance.accent_color }">{{ syllabus.presentation.title }}</h1>
              <p class="text-sm text-muted-foreground">Esta versión es de solo lectura.</p>
            </CardContent>
          </Card>

          <DocumentSignatureCard v-if="syllabus.state === 'aprobado' && syllabus.approved_revision_id" :revision-id="syllabus.approved_revision_id" :file-name="`silabo-${syllabus.code}`" />

          <Card v-if="latestLibraryComment" class="library-comment-card">
            <CardHeader><CardTitle>Comentario de biblioteca</CardTitle><CardDescription>{{ libraryCorrection ? 'Corrija la bibliografía según este comentario y reenvíela.' : 'Último comentario que dejó biblioteca sobre la bibliografía.' }}</CardDescription></CardHeader>
            <CardContent class="flex flex-col gap-4">
              <CommentEntry :revision="latestLibraryComment.revision_number" :content="latestLibraryComment.comment" :author="latestLibraryComment.commented_by" :date="latestLibraryComment.commented_at" />
              <section v-if="libraryComments.length > 1" class="flex flex-col gap-3 text-sm" aria-label="Comentarios anteriores de biblioteca">
                <h3 class="font-medium">Comentarios anteriores</h3>
                <ol class="flex flex-col gap-3">
                  <li v-for="(item, index) in libraryComments.slice(1)" :key="`${item.commented_at}-${index}`"><CommentEntry :revision="item.revision_number" :content="item.comment" :author="item.commented_by" :date="item.commented_at" /></li>
                </ol>
              </section>
            </CardContent>
          </Card>

          <Card v-if="requestedObservations.length">
            <CardHeader><CardTitle>Observaciones de coordinación</CardTitle><CardDescription>Corrija lo indicado en el sílabo y reenvíelo para una nueva revisión.</CardDescription></CardHeader>
            <CardContent class="flex flex-col gap-4">
              <CommentEntry v-for="observation in requestedObservations" :key="observation.id" :revision="observation.revision_number ?? 'actual'" :content="observation.content" />
            </CardContent>
          </Card>

          <template v-for="(section, sectionIndex) in visibleSections" :key="section.id">
          <Separator v-if="sectionIndex > 0" />
          <section :id="`section-${section.id}`" class="flex scroll-mt-6 flex-col gap-6 rounded-xl bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
            <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ sectionHeading(section.title, sectionIndex) }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
            <SyllabusAcademicContext v-if="section.blocks.some((block) => block.content_type === 'institutional')" :variables="syllabus.template_variables ?? {}" />

            <FieldSet v-for="block in section.blocks" :id="`block-${block.id}`" :key="block.id" class="scroll-mt-6 gap-5">
              <FieldLegend v-if="(block.title ?? '').trim() !== '' && section.blocks.length > 1 && (usesTabularDocument(block) || !(block.fields.length === 1 && block.title === block.fields[0]?.label))" :required="block.fields.length === 1 && block.fields[0]?.required">{{ block.title }}</FieldLegend>
              <TemplateDocumentView v-if="usesTabularDocument(block)" :document="block.document" :fields="designFields(block.fields)" :variables="syllabus.template_variables ?? {}" :editable="sectionEditable(section) && !conflict" presentation="form" @value="(key, value) => updateDesignValue(block.fields, key, value)" />
              <FieldError v-if="usesTabularDocument(block)" class="block-errors" :errors="blockErrors(block.fields)" />
              <template v-if="!usesTabularDocument(block)">
                <FieldGroup>
                <template v-for="field in block.fields.filter((item) => !hiddenParts.has(item.key) && (block.content_type !== 'institutional' || (item.teacher_editable && !item.inherited)))" :key="field.id">
                <Field v-if="sectionEditable(section) && field.teacher_editable && !field.inherited && ['texto_corto', 'numero', 'fecha'].includes(field.type)" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Input :id="`input-${field.id}`" :model-value="scalarValue(field)" :type="field.type === 'fecha' ? 'date' : field.type === 'numero' ? 'number' : 'text'" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="sectionEditable(section) && field.teacher_editable && !field.inherited && field.type === 'texto_libre'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><FreeTextEditor :id="`input-${field.id}`" :label="field.label.trim() || section.title" :model-value="isFreeTextDocument(field.value) ? field.value : null" @update:model-value="updateDesignValue([field], field.key, $event)" />
                </Field>

                <Field v-else-if="sectionEditable(section) && field.teacher_editable && !field.inherited && field.type === 'texto_largo'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><FieldDescription v-if="field.help">{{ field.help }}</FieldDescription><Textarea :id="`input-${field.id}`" :model-value="scalarValue(field)" class="min-h-32" @update:model-value="updateScalar(field, String($event))" />
                </Field>

                <Field v-else-if="sectionEditable(section) && field.teacher_editable && !field.inherited && field.type === 'seleccion_unica'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><Select :model-value="String(scalarValue(field))" @update:model-value="updateScalar(field, String($event))"><SelectTrigger :id="`input-${field.id}`"><SelectValue placeholder="Seleccione una opción" /></SelectTrigger><SelectContent><SelectItem v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select>
                </Field>

                <FieldSet v-else-if="sectionEditable(section) && field.teacher_editable && !field.inherited && field.type === 'seleccion_multiple'" :id="`field-${field.id}`" :aria-required="field.required"><FieldLegend class="text-sm" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLegend><Field v-for="option in field.options" :key="option.value" orientation="horizontal"><Checkbox :id="`field-${field.id}-${option.value}`" :model-value="selectedValues(field).includes(option.value)" @update:model-value="toggleChoice(field, option.value, Boolean($event))" /><FieldLabel :for="`field-${field.id}-${option.value}`">{{ option.label }}</FieldLabel></Field></FieldSet>

                <Field v-else-if="sectionEditable(section) && field.teacher_editable && !field.inherited && field.type === 'booleano'" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0"><FieldLabel :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel><BooleanChoice class="boolean-options" :model-value="typeof field.value === 'boolean' ? field.value : null" :label="field.label.trim() || section.title" :aria-invalid="validationFor(field.id).length > 0" @update:model-value="toggleBoolean(field, $event)" /><FieldDescription>Seleccione una respuesta.</FieldDescription></Field>

                <div v-else :id="`field-${field.id}`" class="syllabus-readonly-field rounded-md border bg-muted/30 p-4"><div v-if="field.label.trim() || field.inherited" class="mb-2 flex flex-wrap items-center gap-2 font-medium">{{ field.label }}<Badge v-if="field.inherited" variant="outline">Dato automático</Badge></div><span>{{ masterValue(field.value) }}</span></div>
                <FieldError :errors="visibleValidationMessages(field.id)" />
                </template>
                </FieldGroup>
              </template>
            </FieldSet>
          </section>
          </template>

        </main>

        <aside class="min-w-0" aria-label="Asistente de unidades">
          <SyllabusUnitAssistant
            :syllabus-id="syllabus.id"
            :enabled="canEdit && !conflict"
            :saving="processingAction || savingFieldId !== null || hasUnsavedChanges()"
          />
        </aside>
      </WorkspaceLayout>
    </template>

    <Dialog v-model:open="confirmSubmitOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ libraryCorrection ? '¿Reenviar la bibliografía?' : '¿Enviar a Coordinación?' }}</DialogTitle>
          <DialogDescription v-if="libraryCorrection">La bibliografía corregida vuelve a biblioteca para su verificación, sin pasar por la revisión de coordinación: el resto del sílabo queda como ya fue aprobado.</DialogDescription>
          <DialogDescription v-else>Coordinación revisará el sílabo. Mientras lo revisa, no podrá hacer cambios.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="confirmSubmitOpen = false">Cancelar</Button>
          <Button type="button" :disabled="processingAction || conflict" @click="confirmSubmit"><Send data-icon="inline-start" aria-hidden="true" />{{ libraryCorrection ? 'Reenviar bibliografía' : 'Enviar a Coordinación' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog :open="copySource !== null" @update:open="(open) => { if (!open) copySource = null; }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Copiar desde el paralelo {{ copySource?.parallel }}?</DialogTitle>
          <DialogDescription>Todo lo que escribió en este sílabo se reemplazará por lo del paralelo {{ copySource?.parallel }}. Cada paralelo se envía y se firma por separado.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="copySource = null">Cancelar</Button>
          <Button type="button" :disabled="processingAction || conflict" @click="copyFromSource"><Copy data-icon="inline-start" aria-hidden="true" />Copiar contenido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageFrame>
  <UnsavedChangesDialog :open="discardOpen" title="Hay cambios sin guardar" description="No se pudieron guardar los últimos cambios. Si sale, perderá esos cambios." discard-label="Salir y descartar cambios" @continue="decideDiscard(false)" @discard="decideDiscard(true)" @update:open="(open) => { if (!open) decideDiscard(false); }" />
</template>
