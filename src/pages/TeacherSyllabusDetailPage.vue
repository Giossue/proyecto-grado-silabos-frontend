<script setup lang="ts">
import { freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import { ruleFailures } from '@/lib/blocks/rules';
import { blockAttrs, blockDefinition, templateRuntime } from '@/lib/blocks/runtime';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { useDiscardConfirmation } from '@/composables/useDiscardConfirmation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  getTeacherSigningStatement,
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
import SignatureDialog, { type StatementSigner } from '@/components/domain/syllabus/SignatureDialog.vue';
import SignaturesNote from '@/components/domain/syllabus/SignaturesNote.vue';
import ReviewCommentNotice from '@/components/domain/syllabus/ReviewCommentNotice.vue';
import TeacherFormationDialog from '@/components/domain/identity/TeacherFormationDialog.vue';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import FieldView from '@/components/domain/syllabus/FieldView.vue';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import SyllabusDocumentPreview from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import { attemptKey } from '@/lib/attemptKey';
import { paths } from '@/lib/routes';
import { handleUnauthorized } from '@/lib/unauthorized';
import { ArrowLeft, ArrowRight, Bot, Copy, FileSignature, FileText, GraduationCap, Library, Pencil, Send, X } from '@lucide/vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';

const { open: discardOpen, ask: askToDiscard, decide: decideDiscard } = useDiscardConfirmation();
const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const previewing = ref(false);
const assistantOpen = ref(false);
const assistantLoaded = ref(false);
const toggleAssistant = (): void => {
  assistantLoaded.value = true;
  assistantOpen.value = !assistantOpen.value;
};
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
const signOpen = ref(false);
const formationOpen = ref(false);
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
const isTeacherField = (field: SyllabusField): boolean => field.quien_llena !== 'institucional' && field.teacher_editable === true;
const REVIEW_STAGE_TEXT: Record<string, string> = { coordinacion: 'Coordinación revisa y decide.', biblioteca: 'Coordinación aprobó; biblioteca revisa la bibliografía.' };
const reviewStageLabel = computed(() => REVIEW_STAGE_TEXT[syllabus.value?.review_stage ?? ''] ?? '');
const reviewComments = computed(() =>
  [...(syllabus.value?.review_comments ?? [])].sort(
    (left, right) => new Date(right.commented_at).getTime() - new Date(left.commented_at).getTime(),
  ),
);
const submitDescription = computed(() => syllabus.value?.state === 'correccion_solicitada' && reviewComments.value[0]?.stage === 'biblioteca'
  ? 'Va directo a biblioteca. Mientras lo revisan, no podrá editarlo.'
  : 'Lo revisa coordinación y después biblioteca. Mientras lo revisan, no podrá editarlo.');
const mustSign = computed(() => syllabus.value?.teacher_signature_required === true);
const submitLabel = computed(() => (mustSign.value ? 'Firmar y enviar' : 'Enviar'));
const askSubmit = (): void => {
  if (mustSign.value) signOpen.value = true;
  else confirmSubmitOpen.value = true;
};
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
const blockIssue = computed((): string => {
  for (const field of allFields.value.filter(isTeacherField)) {
    for (const node of field.value ? nodesOfType(field.value as DocumentNode, 'documentBlock') : []) {
      const attrs = blockAttrs(node);
      const definition = blockDefinition(attrs.kind);
      const failure = definition ? ruleFailures(definition.rules, attrs.value, templateRuntime().variables, 'submit')[0] : undefined;
      if (failure) return failure.message;
    }
  }

  return '';
});
const formationEditable = computed(() => canEdit.value && syllabus.value?.teacher_formation_required === true);
const formationMissing = computed(() => formationEditable.value && !sessionState.current.value?.user.formation?.trim());
const submitHint = computed(() => {
  if (formationMissing.value) return "Falta su formación y experiencia";
  if (emptyParts.value === 0 && blockIssue.value !== '') return blockIssue.value;
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

const refreshAfterFormation = async (): Promise<void> => {
  if (await flushAutosave()) await load();
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

const isSignatureFailure = (reason: unknown): boolean =>
  reason instanceof ApiError ? Object.keys(reason.errors).some((key) => key === 'signature' || key.startsWith('signature.')) : true;

const submitKey = attemptKey();
const submit = async (sign: StatementSigner | null = null): Promise<void> => {
  if (!syllabus.value) return;
  try {
    processingAction.value = true;
    error.value = null;
    if (!(await flushAutosave())) {
      signOpen.value = false;
      return;
    }
    const { id, version_bloqueo: version } = syllabus.value;
    let signature = null;
    if (sign) {
      const statement = await getTeacherSigningStatement(id, version);
      if (statement.required) signature = sign(statement.statement);
    }
    syllabus.value = (
      await submitTeacherSyllabus(id, version, submitKey.use(`${id}:${version}`), signature)
    ).syllabus;
    submitKey.reset();
    signOpen.value = false;
    invalidateValidation();
    validationResults.value = [];
  } catch (reason) {
    if (sign && isSignatureFailure(reason)) throw reason;
    signOpen.value = false;
    if (reason instanceof ApiError && reason.status === 409) conflict.value = true;
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


const visibleSections = computed(() => (syllabus.value?.sections ?? []).filter((section) => section.fields.some(isTeacherField)));
const pageDescription = computed(() => syllabus.value ? [syllabus.value.period, syllabus.value.parallels.length ? `Paralelo ${syllabus.value.parallels.join(', ')}` : ''].filter(Boolean).join(' · ') : '');

const chosenSectionId = ref<string | null>(null);
const activeSectionId = computed<string>({
  get: () => visibleSections.value.find((section) => section.id === chosenSectionId.value)?.id ?? visibleSections.value[0]?.id ?? "",
  set: (value) => { chosenSectionId.value = value; },
});
const shownSections = computed(() => visibleSections.value.filter((section) => section.id === activeSectionId.value));
const sectionPosition = computed(() => visibleSections.value.findIndex((section) => section.id === activeSectionId.value));
const previousSection = computed(() => visibleSections.value[sectionPosition.value - 1] ?? null);
const nextSection = computed(() => visibleSections.value[sectionPosition.value + 1] ?? null);
const goToSection = async (id: string): Promise<void> => {
  activeSectionId.value = id;
  await nextTick();
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-surface backdrop-blur sm:px-5" aria-label="Herramientas del sílabo">
    <Button variant="link" size="sm" class="h-auto px-0" as-child><RouterLink :to="paths.teacher.syllabi"><ArrowLeft aria-hidden="true" />Volver a mis sílabos</RouterLink></Button>
    <span class="flex-1" />
    <AppearanceToggle />
  </header>
  <PageFrame :title="syllabus?.subject ?? ''" :description="pageDescription" :loading="!syllabus" header-class="syllabus-editor-header" hide-icon>
    <template v-if="syllabus?.signatures?.length" #meta><SignaturesNote :signatures="syllabus.signatures" /></template>
    <template #actions>
      <Button v-if="syllabus && showEditor && previewing" type="button" variant="outline" @click="previewing = false"><Pencil aria-hidden="true" />Editar</Button>
      <Button v-else-if="syllabus && showEditor" type="button" variant="outline" @click="previewing = true"><FileText aria-hidden="true" />Vista previa</Button>
      <span v-if="saveFailed && canEdit" class="save-status flex items-center gap-2 text-sm text-destructive">Sin guardar<Button type="button" size="sm" variant="outline" :disabled="conflict" @click="retrySave">Reintentar</Button></span>
      <Button v-if="formationEditable && !formationMissing" type="button" variant="outline" @click="formationOpen = true"><GraduationCap aria-hidden="true" />Formación y experiencia</Button>
      <Button v-for="source in copySources" :key="source.id" type="button" variant="outline" :disabled="processingAction || conflict" @click="copySource = source"><Copy aria-hidden="true" />Copiar desde paralelo {{ source.parallel }}</Button>
      <Button v-if="syllabus?.state === 'aprobado' && syllabus.approved_revision_id" as-child variant="outline"><RouterLink :to="paths.teacher.documents(syllabus.approved_revision_id)">Ver PDF</RouterLink></Button>
      <span v-if="syllabus && canEdit" class="flex items-center gap-2"><Tooltip><TooltipTrigger as-child><span class="inline-flex"><Button :disabled="processingAction || conflict || emptyParts > 0 || blockIssue !== '' || formationMissing" @click="askSubmit"><Spinner v-if="processingAction" /><FileSignature v-else-if="mustSign" aria-hidden="true" /><Send v-else aria-hidden="true" />{{ submitLabel }}</Button></span></TooltipTrigger><TooltipContent>{{ submitHint || submitLabel }}</TooltipContent></Tooltip></span>
    </template>

    <span class="sr-only" role="status" aria-live="polite">{{ saveFailed && canEdit ? 'Los últimos cambios no se guardaron.' : '' }}</span>
    <Alert v-if="error" class="feedback error" variant="destructive"><AlertTitle>No se pudo continuar</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ error }}</span><Button v-if="conflict" type="button" variant="outline" @click="load">Recargar borrador</Button></AlertDescription></Alert>
    <LoadingSkeleton v-if="(!syllabus || canStart) && !error" variant="syllabus" />

    <template v-if="syllabus">
      <ProcessLockAlert v-if="editBlockReason && syllabus.state === 'sin_iniciar'" class="edit-blocked" title="Edición no disponible" :message="editBlockReason" hide-action />

      <template v-if="syllabus.state !== 'sin_iniciar' || pausedEdit">
        <div class="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-col gap-8" :class="{ 'pb-16': !pausedEdit }">
          <Alert v-if="syllabus.state === 'en_revision' && reviewStageLabel" class="review-stage"><Library aria-hidden="true" /><AlertTitle>En revisión</AlertTitle><AlertDescription>{{ reviewStageLabel }}</AlertDescription></Alert>
          <ProcessLockAlert v-if="editBlockReason && ['borrador', 'correccion_solicitada'].includes(syllabus.state)" class="edit-blocked" title="Edición no disponible" :message="editBlockReason" hide-action />

          <Alert v-if="formationMissing" class="formation-missing"><GraduationCap aria-hidden="true" /><AlertTitle>Falta su formación y experiencia académica-investigativa</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>Va en la tabla de identificación del sílabo.</span><Button type="button" size="sm" @click="formationOpen = true">Completar</Button></AlertDescription></Alert>
          <ReviewCommentNotice v-if="reviewComments.length" :comments="reviewComments" :correction="syllabus.state === 'correccion_solicitada'" />

          <Tabs v-if="showEditor && !previewing && visibleSections.length > 1" v-model="activeSectionId" class="w-full shrink-0">
            <TabsList class="h-auto w-full flex-wrap justify-start" aria-label="Secciones del sílabo">
              <Tooltip v-for="section in visibleSections" :key="section.id"><TooltipTrigger as-child><TabsTrigger :value="section.id" class="h-10 max-w-64 flex-none px-4 data-[state=active]:font-semibold"><span class="truncate">{{ section.title }}</span></TabsTrigger></TooltipTrigger><TooltipContent>{{ section.title }}</TooltipContent></Tooltip>
            </TabsList>
          </Tabs>
          <template v-if="showEditor && !previewing">
            <section v-for="section in shownSections" :id="`section-${section.id}`" :key="section.id" class="teacher-form flex scroll-mt-6 flex-col gap-6 rounded-md bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
              <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ section.title }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
              <FieldGroup>
                <template v-for="field in section.fields" :key="field.id">
                  <Field v-if="isTeacherField(field)" :id="`field-${field.id}`" :data-invalid="validationFor(field.id).length > 0">
                    <FieldLabel :for="`input-${field.id}`" required :class="{ 'sr-only': !field.label.trim() || field.label.trim() === section.title }">{{ field.label.trim() || section.title }}</FieldLabel>
                    <FieldDescription v-if="field.quien_llena === 'coordinacion'">Viene de la ficha; puede ajustarlo.</FieldDescription>
                    <FieldResponseEditor required :template="field.template" :label="field.label.trim() || section.title" :model-value="field.value" :id="`input-${field.id}`" :disabled="conflict || pausedEdit" @update:model-value="updateValue(field, $event)" />
                  </Field>
                  <FieldView v-else :id="`field-${field.id}`" :field="field" />
                  <FieldError :errors="visibleValidationMessages(field.id)" />
                </template>
              </FieldGroup>
            </section>
            <nav v-if="previousSection || nextSection" class="-mt-4 flex items-center justify-between gap-2" aria-label="Secciones anterior y siguiente">
              <Button v-if="previousSection" type="button" variant="outline" @click="goToSection(previousSection.id)"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Anterior</Button>
              <span v-else />
              <Button v-if="nextSection" type="button" variant="outline" @click="goToSection(nextSection.id)">Siguiente<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </nav>
          </template>
          <SyllabusDocumentPreview v-else :presentation="syllabus.presentation" :sections="syllabus.sections" />

        </div>

        <template v-if="!pausedEdit">
          <aside v-if="assistantLoaded" v-show="assistantOpen" class="fixed right-6 bottom-24 z-40 h-[min(var(--layout-assistant-height),calc(100dvh-8rem))] w-(--layout-syllabus-aside-width) max-w-[calc(100vw-2rem)] max-sm:inset-x-4 max-sm:top-20 max-sm:right-4 max-sm:h-auto max-sm:w-auto" aria-label="Asistente de unidades">
            <SyllabusUnitAssistant
              :syllabus-id="syllabus.id"
              :enabled="canEdit && !conflict"
              :saving="processingAction || savingFieldId !== null || hasUnsavedChanges()"
            />
          </aside>
          <Button type="button" class="fixed right-6 bottom-6 z-40 h-12 rounded-full px-5 shadow-menu max-sm:right-auto max-sm:left-4" :aria-expanded="assistantOpen" @click="toggleAssistant">
            <X v-if="assistantOpen" data-icon="inline-start" aria-hidden="true" /><Bot v-else data-icon="inline-start" aria-hidden="true" />{{ assistantOpen ? 'Cerrar asistente' : 'Asistente' }}
          </Button>
        </template>
      </template>
    </template>

    <Dialog v-model:open="confirmSubmitOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Enviar a revisión?</DialogTitle>
          <DialogDescription>{{ submitDescription }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="confirmSubmitOpen = false">Cancelar</Button>
          <Button type="button" :disabled="processingAction || conflict" @click="confirmSubmit"><Send data-icon="inline-start" aria-hidden="true" />Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <TeacherFormationDialog v-model:open="formationOpen" @saved="refreshAfterFormation" />
    <SignatureDialog v-model:open="signOpen" title="Firmar y enviar" :description="submitDescription" confirm-label="Firmar y enviar" :run="submit" />
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
