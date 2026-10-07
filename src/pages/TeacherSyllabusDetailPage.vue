<script setup lang="ts">
import CommentEntry from '@/components/domain/CommentEntry.vue';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
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
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { fieldTypeEntry, isEmbeddedField } from '@/components/domain/fieldTypes/registry';
import FieldView from '@/components/domain/fieldTypes/FieldView.vue';
import type { TypedField } from '@/types/configuration';
import { paths } from '@/lib/routes';
import { handleUnauthorized } from '@/lib/unauthorized';
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
const allFields = computed(() => (syllabus.value?.sections ?? []).flatMap((section) => section.fields));
const editableFieldIds = computed(() => new Set(allFields.value.map((field) => field.id)));
/** El tipo del registro decide si el docente escribe el campo (la ficha, solo si es ajustable). */
// El servidor manda `teacher_editable`: un dato heredado (p. ej. la formación del perfil) no se escribe en el sílabo.
const isTeacherField = (field: SyllabusField): boolean => field.teacher_editable !== false && (fieldTypeEntry(field.type)?.teacherEditable(fieldConfig(field)) ?? false);
const typed = (field: SyllabusField): TypedField => field;
/** Los datos que el docente escribe dentro de la tabla de identificación se piden justo bajo ella; en la revisión y el Word solo aparece la tabla. */
// Discapacidad: un «Sí/No» decide si se piden el tipo y la descripción (campos opcionales dentro de la tabla de identificación).
const isDisabilityField = (field: SyllabusField): boolean => isEmbeddedField(field) && fieldConfig(field).optional === true;
const hasDisabilityChoice = ref<boolean | null>(null);
const hasDisability = (fields: SyllabusField[]): boolean =>
  hasDisabilityChoice.value ?? fields.filter(isDisabilityField).some((field) => !isFieldEmpty(field));
const chooseDisability = (fields: SyllabusField[], value: string): void => {
  hasDisabilityChoice.value = value === 'si';
  if (value === 'si') return;
  for (const field of fields.filter(isDisabilityField).filter((item) => !isFieldEmpty(item))) {
    updateValue(field, { type: 'doc', content: [{ type: 'paragraph' }] });
  }
};
const sectionEntries = (fields: SyllabusField[]): Array<{ field: SyllabusField; nested: boolean; hint: boolean }> => {
  const embedded = fields.filter(isEmbeddedField);
  const host = fields.find((field) => field.type === 'automatico' && fieldConfig(field).source === 'identification_card');
  if (embedded.length === 0 || !host) return fields.map((field) => ({ field, nested: false, hint: false }));
  return fields.filter((field) => !isEmbeddedField(field)).flatMap((field) => [
    { field, nested: false, hint: false },
    ...(field === host ? embedded.map((item, index) => ({ field: item, nested: true, hint: index === 0 })) : []),
  ]);
};
const REVIEW_STAGE_TEXT: Record<string, string> = { biblioteca: 'Biblioteca revisa la bibliografía.', coordinacion: 'Biblioteca aprobó; coordinación revisa y decide.' };
const reviewStageLabel = computed(() => REVIEW_STAGE_TEXT[syllabus.value?.review_stage ?? ''] ?? '');
const STAGE_NAME: Record<string, string> = { biblioteca: 'Biblioteca', coordinacion: 'Coordinación' };
const stageName = (stage: string): string => STAGE_NAME[stage] ?? stage;
const reviewComments = computed(() =>
  [...(syllabus.value?.review_comments ?? [])].sort(
    (left, right) => new Date(right.commented_at).getTime() - new Date(left.commented_at).getTime(),
  ),
);
const latestReviewComment = computed(() => reviewComments.value[0] ?? null);
const canStart = computed(() =>
  syllabus.value?.state === "sin_iniciar" && editBlockReason.value === null,
);
const validationFor = (fieldId: string) =>
  validationResults.value.filter((result) => result.field_id === fieldId);
const visibleValidationMessages = (fieldId: string): string[] =>
  validationFor(fieldId).map((result) => result.message);
const partTargets = computed(() => new Map(allFields.value.map((field) => [field.id, `field-${field.id}`])));
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
const isFieldEmpty = (field: SyllabusField): boolean => fieldTypeEntry(field.type)?.isEmpty(field.value, fieldConfig(field)) ?? false;
const emptyParts = computed(() =>
  allFields.value.filter((field) => field.required && isTeacherField(field)).filter(isFieldEmpty).length,
);
const submitHint = computed(() => {
  if (emptyParts.value === 1) return "Falta 1 campo por completar";
  if (emptyParts.value > 1) return `Faltan ${emptyParts.value} campos por completar`;
  return "";
});
const goToPart = async (fieldId: string | null): Promise<void> => {
  const owner = fieldId ? visibleSections.value.find((section) => section.fields.some((field) => field.id === fieldId)) : null;
  if (owner && canEdit.value) {
    activeSectionId.value = owner.id;
    await nextTick();
  }
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

const updateValue = (field: SyllabusField, value: unknown): void => {
  field.value = value as SyllabusField['value'];
  clearFieldValidation(field.id);
  scheduleSave(field);
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
// Al editar, el formulario se reparte en pestañas (una por sección); en solo lectura se ve completo.
const chosenSectionId = ref<string | null>(null);
const activeSectionId = computed<string>({
  get: () => visibleSections.value.find((section) => section.id === chosenSectionId.value)?.id ?? visibleSections.value[0]?.id ?? "",
  set: (value) => { chosenSectionId.value = value; },
});
const shownSections = computed(() => canEdit.value
  ? visibleSections.value.filter((section) => section.id === activeSectionId.value)
  : visibleSections.value);

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
      <span v-if="syllabus && canEdit" class="flex items-center gap-2"><Tooltip><TooltipTrigger as-child><span class="inline-flex"><Button :disabled="processingAction || conflict || emptyParts > 0" @click="confirmSubmitOpen = true"><Spinner v-if="processingAction" /><Send v-else aria-hidden="true" />Enviar sílabo</Button></span></TooltipTrigger><TooltipContent>{{ submitHint || 'Enviar la revisión del sílabo' }}</TooltipContent></Tooltip></span>
    </template>

    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="(!syllabus || canStart) && !error" variant="syllabus" :readonly="Boolean(syllabus && !canEdit)" />

    <template v-if="syllabus">
      <Alert v-if="editBlockReason && ['sin_iniciar', 'borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked"><AlertTitle>Edición no disponible</AlertTitle><AlertDescription>{{ editBlockReason }}</AlertDescription></Alert>

      <Alert v-if="syllabus.state === 'en_revision' && reviewStageLabel" class="review-stage"><Library aria-hidden="true" /><AlertTitle>En revisión</AlertTitle><AlertDescription>{{ reviewStageLabel }}</AlertDescription></Alert>
      <Alert v-if="syllabus.state === 'correccion_solicitada'"><AlertTitle>Está preparando una nueva revisión</AlertTitle><AlertDescription>Modifique el trabajo según el comentario de la revisión antes de reenviar.</AlertDescription></Alert>

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

          <Card v-if="latestReviewComment" class="library-comment-card">
            <CardHeader><CardTitle>Comentario de {{ stageName(latestReviewComment.stage) }}</CardTitle><CardDescription>{{ syllabus.state === 'correccion_solicitada' ? 'Corrija lo indicado y reenvíe el sílabo; volverá a biblioteca.' : 'Último comentario que recibió este sílabo en la revisión.' }}</CardDescription></CardHeader>
            <CardContent class="flex flex-col gap-4">
              <CommentEntry :revision="latestReviewComment.revision_number" :content="latestReviewComment.comment" :author="`${latestReviewComment.commented_by} · ${stageName(latestReviewComment.stage)}`" :date="latestReviewComment.commented_at" />
              <section v-if="reviewComments.length > 1" class="flex flex-col gap-3 text-sm" aria-label="Comentarios anteriores de la revisión">
                <h3 class="font-medium">Comentarios anteriores</h3>
                <ol class="flex flex-col gap-3">
                  <li v-for="(item, index) in reviewComments.slice(1)" :key="`${item.commented_at}-${index}`"><CommentEntry :revision="item.revision_number" :content="item.comment" :author="`${item.commented_by} · ${stageName(item.stage)}`" :date="item.commented_at" /></li>
                </ol>
              </section>
            </CardContent>
          </Card>

          <Tabs v-if="canEdit && visibleSections.length > 1" v-model="activeSectionId" class="w-full">
            <TabsList class="h-auto w-full flex-wrap justify-start gap-1" aria-label="Secciones del sílabo">
              <TabsTrigger v-for="(section, index) in visibleSections" :key="section.id" :value="section.id" class="max-w-56" :title="sectionHeading(section.title, index)"><span class="truncate">{{ sectionHeading(section.title, index) }}</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <template v-for="section in shownSections" :key="section.id">
          <Separator v-if="!canEdit && section.id !== visibleSections[0]?.id" />
          <section :id="`section-${section.id}`" class="flex scroll-mt-6 flex-col gap-6 rounded-xl bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
            <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ sectionHeading(section.title, visibleSections.indexOf(section)) }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
            <FieldGroup>
              <template v-for="{ field, nested, hint } in sectionEntries(section.fields)" :key="field.id">
                <template v-if="hint && canEdit">
                  <Field v-if="section.fields.some(isDisabilityField)">
                    <FieldLabel for="disability-choice">¿Tiene estudiantes con discapacidad?</FieldLabel>
                    <Select :model-value="hasDisability(section.fields) ? 'si' : 'no'" :disabled="conflict" @update:model-value="chooseDisability(section.fields, String($event))">
                      <SelectTrigger id="disability-choice" class="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup><SelectItem value="no">No</SelectItem><SelectItem value="si">Sí</SelectItem></SelectGroup></SelectContent>
                    </Select>
                  </Field>
                </template>
                <Field v-if="canEdit && isTeacherField(field) && (!isDisabilityField(field) || hasDisability(section.fields))" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0" :class="nested && 'border-l-2 border-border pl-4'">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel>
                  <FieldDescription v-if="field.help">{{ field.help }}</FieldDescription>
                  <component :is="fieldTypeEntry(field.type)!.EditorComponent" :field="typed(field)" :model-value="field.value" :id="`input-${field.id}`" :disabled="conflict" @update:model-value="updateValue(field, $event)" />
                </Field>
                <FieldView v-else-if="!nested" :id="`field-${field.id}`" :field="typed(field)" :badge="field.inherited ? 'Dato automático' : undefined" />
                <FieldError :errors="visibleValidationMessages(field.id)" />
              </template>
            </FieldGroup>
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
          <DialogTitle>¿Enviar a revisión?</DialogTitle>
          <DialogDescription>Biblioteca revisa primero la bibliografía; después coordinación decide la aprobación final. Mientras lo revisan, no podrá hacer cambios.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="confirmSubmitOpen = false">Cancelar</Button>
          <Button type="button" :disabled="processingAction || conflict" @click="confirmSubmit"><Send data-icon="inline-start" aria-hidden="true" />Enviar a revisión</Button>
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
