<script setup lang="ts">
import { ArrowLeft, LockKeyhole, MoreHorizontal, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { approveReview, getReview, requestCorrection, reviewStageLabel, type ReviewDetail } from '@/api/reviews';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import ReviewHistorySheet from '@/components/domain/syllabus/ReviewHistorySheet.vue';
import SignatureDialog, { type StatementSigner } from '@/components/domain/syllabus/SignatureDialog.vue';
import SignaturesNote from '@/components/domain/syllabus/SignaturesNote.vue';
import SyllabusDeleteDialog from '@/components/domain/syllabus/SyllabusDeleteDialog.vue';
import SyllabusDocumentPreview, { type PreviewSection } from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import SyllabusResetDialog from '@/components/domain/syllabus/SyllabusResetDialog.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
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
const resetOpen = ref(false);
const deleteOpen = ref(false);
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
const stageLabel = computed(() => reviewStageLabel(data.value?.syllabus.stage));
const canReset = computed(() => Boolean(data.value?.reset.allowed && data.value.revision.is_current));
const canDelete = computed(() => Boolean(data.value?.can_delete && data.value.revision.is_current));
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
const deleted = async (message: string): Promise<void> => {
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
  <PageFrame v-if="data && !loadError" :title="data.syllabus.subject" :description="`${data.syllabus.code} · ${data.syllabus.period} · ${data.syllabus.teachers.join(', ')}`">
    <template #eyebrow><Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="area.reviews"><ArrowLeft aria-hidden="true" />Volver a la cola</RouterLink></Button></template>
    <template #meta>
      <SyllabusStateBadge :state="data.syllabus.state" />
      <span v-if="data.syllabus.state === 'en_revision' && stageLabel" class="text-sm text-muted-foreground">{{ stageLabel }}</span>
      <SignaturesNote :signatures="data.signatures" />
    </template>
    <template #actions>
      <Button type="button" variant="outline" @click="historyOpen = true">Historial</Button>
      <Button v-if="approvedCurrent" as-child variant="outline"><RouterLink :to="area.documents(data.revision.id)">Ver PDF</RouterLink></Button>
      <DropdownMenu v-if="canReset || canDelete">
        <DropdownMenuTrigger as-child><Button type="button" variant="outline" size="icon" aria-label="Más"><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem v-if="canReset" @select="resetOpen = true">Reiniciar sílabo</DropdownMenuItem>
            <DropdownMenuItem v-if="canDelete" variant="destructive" @select="deleteOpen = true">Eliminar sílabo</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button v-if="canReviewCurrent" type="button" variant="outline" @click="openCorrection">Solicitar corrección</Button>
      <Button v-if="canSign" type="button" @click="signOpen = true">Firmar y enviar a biblioteca</Button>
    </template>

    <Alert v-if="!data.decisions_allowed"><LockKeyhole aria-hidden="true" /><AlertTitle>Convocatoria cerrada</AlertTitle><AlertDescription>Solo consulta.</AlertDescription></Alert>
    <Alert v-if="!data.revision.is_current"><LockKeyhole aria-hidden="true" /><AlertTitle>Revisión {{ data.revision.number }} (anterior)</AlertTitle><AlertDescription>Solo consulta. Las acciones están en la revisión vigente.</AlertDescription></Alert>
    <Alert v-if="data.revision.is_current && data.syllabus.state === 'en_revision' && !canReviewCurrent && data.decisions_allowed"><LockKeyhole aria-hidden="true" /><AlertTitle>{{ stageLabel || 'En revisión' }}</AlertTitle><AlertDescription>Ahora lo revisa otra persona.</AlertDescription></Alert>
    <Alert v-if="data.correction_request"><Undo2 aria-hidden="true" /><AlertTitle>Corrección solicitada<template v-if="data.correction_request.stage"> ({{ reviewStageLabel(data.correction_request.stage).replace('En ', '') }})</template></AlertTitle><AlertDescription>{{ data.correction_request.justification }}<template v-if="data.correction_request.requested_by"> · {{ data.correction_request.requested_by }}</template></AlertDescription></Alert>

    <SyllabusDocumentPreview :presentation="data.presentation" :sections="previewSections" />

    <ReviewHistorySheet v-model:open="historyOpen" :history="data.history" :current-id="data.revision.id" />
    <SyllabusResetDialog v-if="canReset" v-model:open="resetOpen" :show-trigger="false" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @saved="changed" />
    <SyllabusDeleteDialog v-if="canDelete" v-model:open="deleteOpen" :show-trigger="false" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @deleted="deleted" />

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
    <SignatureDialog v-model:open="signOpen" title="Firmar y enviar a biblioteca" description="Biblioteca revisará la bibliografía." confirm-label="Firmar y enviar" :run="approve" />
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" review-stage="coordination" />
</template>
