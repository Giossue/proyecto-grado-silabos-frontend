<script setup lang="ts">
import { ArrowLeft, FileSignature, FileText, History, MoreHorizontal, RotateCcw, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { approveReview, getReview, requestCorrection, reviewStageLabel, type ReviewDetail } from '@/api/reviews';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import ReviewHistorySheet from '@/components/domain/syllabus/ReviewHistorySheet.vue';
import SignatureDialog, { type StatementSigner } from '@/components/domain/syllabus/SignatureDialog.vue';
import ReviewCommentNotice from '@/components/domain/syllabus/ReviewCommentNotice.vue';
import SyllabusDocumentPreview, { type PreviewSection } from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import SyllabusRestartDialog from '@/components/domain/syllabus/SyllabusRestartDialog.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { goBack } from '@/lib/goBack';
import { sheetPixels } from '@/lib/documentLayout';
import { openRevisionPdf } from '@/lib/openPdf';
import { reviewAreaPaths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const router = useRouter();
const area = reviewAreaPaths();
const data = ref<ReviewDetail | null>(null);
const loading = ref(true);
const loadError = ref('');
const historyOpen = ref(false);
const correctionOpen = ref(false);
const signOpen = ref(false);
const restartOpen = ref(false);
const correcting = ref(false);
const correctionJustification = ref('');
const correctionErrors = ref<string[]>([]);

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = '';
  try {
    data.value = await getReview(String(route.params.revision));
  } catch (failure) {
    loadError.value = failure instanceof ApiError ? failure.message : 'No se pudo cargar la revisión.';
  } finally {
    loading.value = false;
  }
};

const canReviewCurrent = computed(() => Boolean(data.value?.can_decide && data.value.revision.is_current && data.value.syllabus.state === 'en_revision'));
const canSign = computed(() => canReviewCurrent.value && Boolean(data.value?.signing_statement));
const sheetWidth = computed(() => (data.value ? sheetPixels(data.value.presentation.document).portrait : 0));
const statusNotes = computed(() => {
  if (!data.value) return [];
  const notes: string[] = [];
  if (!data.value.decisions_allowed) notes.push('Convocatoria cerrada · solo consulta');
  if (!data.value.revision.is_current) notes.push(`Revisión ${data.value.revision.number} (anterior) · solo consulta`);
  if (data.value.syllabus.state === 'en_revision' && stageLabel.value) notes.push(stageLabel.value);
  if (data.value.correction_request?.stage === 'biblioteca') notes.push('Devuelto por biblioteca');

  return notes;
});
const correctionComments = computed(() => {
  const request = data.value?.correction_request;
  if (!data.value || !request || request.justification === null) return null;

  return [{ stage: request.stage ?? 'coordinacion', comment: request.justification, commented_at: request.requested_at, commented_by: request.requested_by ?? '', revision_number: data.value.revision.number }];
});
const openingPdf = ref(false);
const openPdf = async (revisionId: string): Promise<void> => {
  openingPdf.value = true;
  const failure = await openRevisionPdf(revisionId);
  openingPdf.value = false;
  if (failure) toast.error(failure);
};
const stageLabel = computed(() => reviewStageLabel(data.value?.syllabus.stage));
const canReset = computed(() => Boolean(data.value?.reset.allowed && data.value.revision.is_current));
const approvedCurrent = computed(() => data.value?.history.find((item) => item.id === data.value?.revision.id && item.approved_at) ?? null);
const previewSections = computed<PreviewSection[]>(() => (data.value?.revision.snapshot.sections ?? []).map((section) => ({
  id: section.key,
  title: section.title,
  orientation: section.orientation,
  fields: section.fields.map((field) => ({ ...field, id: field.id ?? field.key })),
})));

const changed = async (message: string): Promise<void> => {
  toast.success(message);
  await load();
};
const restarted = async (message: string): Promise<void> => {
  if (!data.value?.reset.erases_history) { await changed(message); return; }
  toast.success(message);
  await router.replace(area.reviews);
};

const openCorrection = (): void => {
  correctionErrors.value = [];
  correctionOpen.value = true;
};
const submitCorrection = async (): Promise<void> => {
  if (!data.value) return;
  correcting.value = true;
  correctionErrors.value = [];
  try {
    const result = await requestCorrection(data.value.revision.id, { justification: correctionJustification.value });
    correctionOpen.value = false;
    correctionJustification.value = '';
    await changed(result.message);
  } catch (failure) {
    const fieldErrors = failure instanceof ApiError ? [...(failure.errors.justification ?? []), ...(failure.errors.revision ?? [])] : [];
    correctionErrors.value = fieldErrors.length ? fieldErrors : [failure instanceof ApiError ? failure.message : 'No se pudo solicitar la corrección.'];
  } finally {
    correcting.value = false;
  }
};

const approve = async (sign: StatementSigner): Promise<void> => {
  if (!data.value?.signing_statement) return;
  const result = await approveReview(data.value.revision.id, sign(data.value.signing_statement));
  signOpen.value = false;
  await changed(result.message);
};

watch(() => route.params.revision, (current, previous) => { if (current !== previous) void load(); });
onMounted(load);
</script>

<template>
  <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-surface backdrop-blur sm:px-5" aria-label="Herramientas de la revisión">
    <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, area.reviews)"><ArrowLeft aria-hidden="true" />Volver a la cola</Button>
    <span class="flex-1" />
    <AppearanceToggle />
  </header>
  <PageFrame v-if="data && !loadError" header-class="syllabus-editor-header" :header-width="sheetWidth" hide-icon :title="data.syllabus.subject" :description="`${data.syllabus.period} · ${data.syllabus.teachers.join(', ')}`">
    <template #title-badge>
      <SyllabusStateBadge :state="data.syllabus.state" />
      <span v-for="note in statusNotes" :key="note" class="text-sm text-muted-foreground">{{ note }}</span>
    </template>
    <template #actions>
      <Button v-if="approvedCurrent" type="button" :disabled="openingPdf" @click="openPdf(data.revision.id)"><Spinner v-if="openingPdf" /><FileText v-else aria-hidden="true" />Ver PDF</Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child><Button type="button" variant="ghost" size="icon" aria-label="Más"><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem @select="historyOpen = true"><History data-icon="inline-start" aria-hidden="true" />Historial</DropdownMenuItem>
          </DropdownMenuGroup>
          <template v-if="canReset">
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" @select="restartOpen = true"><RotateCcw data-icon="inline-start" aria-hidden="true" />Reiniciar sílabo</DropdownMenuItem>
            </DropdownMenuGroup>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button v-if="canReviewCurrent" type="button" variant="outline" @click="openCorrection">Solicitar corrección</Button>
      <Button v-if="canSign" type="button" @click="signOpen = true"><FileSignature data-icon="inline-start" aria-hidden="true" />Firmar y enviar a biblioteca</Button>
    </template>

    <div v-if="correctionComments" class="mx-auto w-full" :style="{ maxWidth: `${sheetWidth}px` }">
      <ReviewCommentNotice :comments="correctionComments" />
    </div>

    <SyllabusDocumentPreview :presentation="data.presentation" :sections="previewSections" />

    <ReviewHistorySheet v-model:open="historyOpen" :history="data.history" :current-id="data.revision.id" />
    <SyllabusRestartDialog v-if="canReset" v-model:open="restartOpen" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" :impact="data.reset" @saved="restarted" />

    <Dialog v-model:open="correctionOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar corrección</DialogTitle>
          <DialogDescription>El sílabo vuelve al docente con su comentario.</DialogDescription>
        </DialogHeader>
        <form id="correction-form" class="flex flex-col gap-4" @submit.prevent="submitCorrection">
          <Field :data-invalid="correctionErrors.length > 0">
            <FieldLabel for="correction-justification" required>Comentario para el docente</FieldLabel>
            <Textarea id="correction-justification" v-model="correctionJustification" rows="4" required placeholder="Ej. Revise los resultados de aprendizaje de la unidad 2." />
            <FieldError :errors="correctionErrors" />
          </Field>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" :disabled="correcting">Cancelar</Button></DialogClose>
            <Button type="submit" variant="destructive" :disabled="correcting"><Spinner v-if="correcting" data-icon="inline-start" /><Undo2 v-else data-icon="inline-start" aria-hidden="true" />Solicitar corrección</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <SignatureDialog v-model:open="signOpen" title="Firmar y enviar a biblioteca" confirm-label="Firmar y enviar" :run="approve" />
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <PageFrame v-else-if="loading" title="" description="" loading header-class="syllabus-editor-header" hide-icon><LoadingSkeleton variant="preview" /></PageFrame>
</template>
