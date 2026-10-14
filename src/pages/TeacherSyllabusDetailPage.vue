<script setup lang="ts">
import { freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import { unitsContext } from '@/lib/blockLayouts';
import { blockOf, nodesOfType, PLANNING_WEEKS, plannedHours, type DocumentNode } from '@/lib/templateDocument';
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
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import FieldView from '@/components/domain/syllabus/FieldView.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
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
const pausedEdit = computed(() =>
  editBlockReason.value !== null && ["sin_iniciar", "borrador", "correccion_solicitada"].includes(syllabus.value?.state ?? ""),
);
const showEditor = computed(() => canEdit.value || pausedEdit.value);
const allFields = computed(() => (syllabus.value?.sections ?? []).flatMap((section) => section.fields));
const editableFieldIds = computed(() => new Set(allFields.value.map((field) => field.id)));
const isTeacherField = (field: SyllabusField): boolean => field.quien_llena === 'docente' && field.teacher_editable !== false;
const REVIEW_STAGE_TEXT: Record<string, string> = { coordinacion: 'Coordinación revisa y decide.', biblioteca: 'Coordinación aprobó; biblioteca revisa la bibliografía.' };
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
const isFieldEmpty = (field: SyllabusField): boolean => !field.value || freeTextPlain(field.value).trim() === '';
const emptyParts = computed(() =>
  allFields.value.filter((field) => field.required && isTeacherField(field)).filter(isFieldEmpty).length,
);
/** Las unidades deben repartir las 16 semanas y las horas exactas de la asignatura; el servidor lo vuelve a exigir al enviar. */
const unitsIssue = computed((): string => {
  const target = unitsContext()?.hours;
  for (const field of allFields.value.filter(isTeacherField)) {
    for (const node of field.value ? nodesOfType(field.value as DocumentNode, 'documentBlock') : []) {
      const block = blockOf(node);
      if (block.kind !== 'unidades') continue;
      const units = block.value.units ?? [];
      const weeks = units.reduce((sum, unit) => sum + unit.semanas.length, 0);
      if (weeks !== PLANNING_WEEKS) return `Las unidades deben repartir las ${PLANNING_WEEKS} semanas: tienen ${weeks}`;
      const planned = plannedHours(units);
      if (target && ([['ACD', 'acd'], ['APE', 'ape'], ['AA', 'aa']] as const).some(([, key]) => Math.abs(planned[key] - target[key]) > 0.001)) {
        return 'Las horas de las unidades deben sumar las de la asignatura';
      }
    }
  }

  return '';
});
const submitHint = computed(() => {
  if (emptyParts.value === 0 && unitsIssue.value !== '') return unitsIssue.value;
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

const updateValue = (field: SyllabusField, value: DocumentNode): void => {
  if (!isTeacherField(field) || !canEdit.value || conflict.value) return;
  field.value = value;
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


const visibleSections = computed(() => syllabus.value?.sections ?? []);

const chosenSectionId = ref<string | null>(null);
const activeSectionId = computed<string>({
  get: () => visibleSections.value.find((section) => section.id === chosenSectionId.value)?.id ?? visibleSections.value[0]?.id ?? "",
  set: (value) => { chosenSectionId.value = value; },
});
const shownSections = computed(() => showEditor.value
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
      <span class="sr-only" role="status" aria-live="polite">{{ saveFailed && canEdit ? 'Los últimos cambios no se guardaron.' : '' }}</span>
      <span v-if="saveFailed && canEdit" class="save-status flex items-center gap-2 text-sm text-destructive">Sin guardar<Button type="button" size="sm" variant="outline" :disabled="conflict" @click="retrySave">Reintentar</Button></span>
      <Button v-for="source in copySources" :key="source.id" type="button" variant="outline" :disabled="processingAction || conflict" @click="copySource = source"><Copy aria-hidden="true" />Copiar desde paralelo {{ source.parallel }}</Button>
      <span v-if="syllabus && canEdit" class="flex items-center gap-2"><Tooltip><TooltipTrigger as-child><span class="inline-flex"><Button :disabled="processingAction || conflict || emptyParts > 0 || unitsIssue !== ''" @click="confirmSubmitOpen = true"><Spinner v-if="processingAction" /><Send v-else aria-hidden="true" />Enviar sílabo</Button></span></TooltipTrigger><TooltipContent>{{ submitHint || 'Enviar la revisión del sílabo' }}</TooltipContent></Tooltip></span>
    </template>

    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="(!syllabus || canStart) && !error" variant="syllabus" :readonly="Boolean(syllabus && !canEdit)" />

    <template v-if="syllabus">
      <h1 class="sr-only">Sílabo de {{ syllabus.subject }} · {{ syllabus.period }}</h1>
      <ProcessLockAlert v-if="editBlockReason && syllabus.state === 'sin_iniciar'" class="edit-blocked" title="Edición no disponible" :message="editBlockReason" hide-action />

      <Alert v-if="syllabus.state === 'en_revision' && reviewStageLabel" class="review-stage"><Library aria-hidden="true" /><AlertTitle>En revisión</AlertTitle><AlertDescription>{{ reviewStageLabel }}</AlertDescription></Alert>
      <Alert v-if="syllabus.state === 'correccion_solicitada'"><AlertTitle>Está preparando una nueva revisión</AlertTitle><AlertDescription>Modifique el trabajo según el comentario de la revisión antes de reenviar.</AlertDescription></Alert>

      <WorkspaceLayout v-if="syllabus.state !== 'sin_iniciar' || pausedEdit" variant="syllabus">
        <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
          <ProcessLockAlert v-if="editBlockReason && ['borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked" title="Edición no disponible" :message="editBlockReason" hide-action />
          <Card v-if="!showEditor" class="syllabus-document-header">
            <CardContent class="flex flex-col items-center gap-5 py-8 text-center">
              <div class="flex w-full items-center justify-between gap-6"><img :src="syllabus.presentation.logos.institution" alt="Logo institucional" class="max-h-10 max-w-40 object-contain" /><img :src="syllabus.presentation.logos.faculty" alt="Logo de facultad" class="max-h-14 max-w-40 object-contain" /></div>
              <h2 class="text-xl font-semibold" :style="{ color: syllabus.presentation.appearance.accent_color }">{{ syllabus.presentation.title }}</h2>
              <p class="text-sm text-muted-foreground">Esta versión es de solo lectura.</p>
            </CardContent>
          </Card>

          <DocumentSignatureCard v-if="syllabus.state === 'aprobado' && syllabus.approved_revision_id" :revision-id="syllabus.approved_revision_id" :file-name="`silabo-${syllabus.code}`" />

          <Card v-if="latestReviewComment" class="library-comment-card">
            <CardHeader><CardTitle>Comentario de {{ stageName(latestReviewComment.stage) }}</CardTitle><CardDescription>{{ syllabus.state === 'correccion_solicitada' ? (latestReviewComment.stage === 'biblioteca' ? 'Corrija lo indicado y reenvíe el sílabo; irá directo a biblioteca.' : 'Corrija lo indicado y reenvíe el sílabo; volverá a coordinación.') : 'Último comentario que recibió este sílabo en la revisión.' }}</CardDescription></CardHeader>
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

          <Tabs v-if="showEditor && visibleSections.length > 1" v-model="activeSectionId" class="w-full shrink-0">
            <TabsList class="h-auto min-h-9 w-full shrink-0 flex-wrap justify-start gap-1" aria-label="Secciones del sílabo">
              <TabsTrigger v-for="section in visibleSections" :key="section.id" :value="section.id" class="h-8 max-w-56 flex-none" :title="section.title"><span class="truncate">{{ section.title }}</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <template v-for="section in shownSections" :key="section.id">
          <Separator v-if="!showEditor && section.id !== visibleSections[0]?.id" />
          <section :id="`section-${section.id}`" class="flex scroll-mt-6 flex-col gap-6 rounded-xl bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
            <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ section.title }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
            <FieldGroup>
              <template v-for="field in section.fields" :key="field.id">
                <Field v-if="showEditor && isTeacherField(field)" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                  <FieldLabel :for="`input-${field.id}`" :required="field.required" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || section.title }}</FieldLabel>
                  <FieldDescription v-if="field.help">{{ field.help }}</FieldDescription>
                  <FreeTextEditor :label="field.label.trim() || section.title" :model-value="field.value" :id="`input-${field.id}`" :disabled="conflict || pausedEdit" @update:model-value="updateValue(field, $event)" />
                </Field>
                <FieldView v-else :id="`field-${field.id}`" :field="field" />
                <FieldError :errors="visibleValidationMessages(field.id)" />
              </template>
            </FieldGroup>
          </section>
          </template>

        </div>

        <aside v-if="!pausedEdit" class="min-w-0" aria-label="Asistente de unidades">
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
          <DialogDescription>Coordinación revisa primero; después biblioteca aprueba la bibliografía y el sílabo queda aprobado. Mientras lo revisan, no podrá hacer cambios.</DialogDescription>
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
