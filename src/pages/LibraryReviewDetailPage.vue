<script setup lang="ts">
import { ArrowLeft, FileSignature, FileText, MessageSquareText } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, verifyLibraryReview, type LibraryReviewDetail } from '@/api/library';
import EmptyState from '@/components/domain/EmptyState.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { goBack } from '@/lib/goBack';
import { openRevisionPdf } from '@/lib/openPdf';
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import SignatureDialog, { type StatementSigner } from '@/components/domain/syllabus/SignatureDialog.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const router = useRouter();
const review = ref<LibraryReviewDetail | null>(null);
const loading = ref(true);
const loadError = ref('');
const returnOpen = ref(false);
const signOpen = ref(false);
const selectedReasons = ref<string[]>([]);
const reasonErrors = ref<string[]>([]);
const otherReason = ref('');
const otherErrors = ref<string[]>([]);
const returnError = ref('');
const sending = ref(false);
const OTHER_REASON = 'otro';
const otherSelected = computed(() => selectedReasons.value.includes(OTHER_REASON));
const previousPage: unknown = window.history.state?.back;
const fromHistory = typeof previousPage === 'string' && previousPage.split('?')[0] === paths.library.history;
const openingPdf = ref(false);
const openPdf = async (): Promise<void> => {
  if (!review.value) return;
  openingPdf.value = true;
  const failure = await openRevisionPdf(review.value.revision_id);
  openingPdf.value = false;
  if (failure) toast.error(failure);
};
const canSign = computed(() => Boolean(review.value?.can_verify && review.value.signing_statement));
const fields = computed(() => (review.value?.sections ?? []).flatMap((section) =>
  section.fields.map((field) => ({ ...field, title: field.label.trim() || section.title }))));

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = '';
  try {
    review.value = (await getLibraryReview(String(route.params.revision))).review;
  } catch (failure) {
    loadError.value = failure instanceof ApiError ? failure.message : 'No se pudo cargar la bibliografía.';
  } finally {
    loading.value = false;
  }
};

const toggleReason = (code: string, checked: boolean | 'indeterminate'): void => {
  selectedReasons.value = checked === true
    ? [...selectedReasons.value, code]
    : selectedReasons.value.filter((item) => item !== code);
};

const openReturn = (): void => {
  reasonErrors.value = [];
  otherErrors.value = [];
  returnError.value = '';
  returnOpen.value = true;
};

const sendReturn = async (): Promise<void> => {
  if (!review.value) return;
  reasonErrors.value = [];
  otherErrors.value = [];
  returnError.value = '';
  if (selectedReasons.value.length === 0) {
    reasonErrors.value = ['Elija al menos un motivo.'];
    return;
  }
  if (otherSelected.value && otherReason.value.trim().length < 5) {
    otherErrors.value = ['Escriba el otro motivo (mínimo 5 caracteres).'];
    return;
  }
  sending.value = true;
  try {
    const result = await commentLibraryReview(review.value.revision_id, {
      reasons: selectedReasons.value,
      ...(otherSelected.value ? { other: otherReason.value.trim() } : {}),
    });
    returnOpen.value = false;
    selectedReasons.value = [];
    otherReason.value = '';
    toast.success(result.message);
    await load();
  } catch (failure) {
    if (failure instanceof ApiError) {
      reasonErrors.value = failure.errors.reasons ?? failure.errors['reasons.0'] ?? [];
      otherErrors.value = failure.errors.other ?? [];
      returnError.value = failure.message;
    } else {
      returnError.value = 'No se pudo devolver el sílabo.';
    }
  } finally {
    sending.value = false;
  }
};

const approve = async (sign: StatementSigner): Promise<void> => {
  if (!review.value?.signing_statement) return;
  const result = await verifyLibraryReview(review.value.revision_id, sign(review.value.signing_statement));
  signOpen.value = false;
  toast.success(result.message);
  await load();
};

const outcomeBadge = computed((): { label: string; tone: StatusTone } | null => {
  if (review.value?.outcome === 'firmado') return { label: 'Aprobado', tone: 'success' };
  if (review.value?.outcome === 'devuelto') return { label: 'Devuelto al docente', tone: 'danger' };
  if (review.value?.outcome === 'reemplazado') return { label: 'Reemplazado', tone: 'neutral' };

  return null;
});

watch(() => route.params.revision, (current, previous) => { if (current !== previous) void load(); });
onMounted(load);
</script>

<template>
  <PageFrame v-if="review && !loadError" :title="review.subject" :description="`${review.career} · ${review.teachers.join(', ')}`" hide-icon size="narrow">
    <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, fromHistory ? paths.library.history : paths.library.reviews)"><ArrowLeft aria-hidden="true" />{{ fromHistory ? 'Volver al historial' : 'Volver a revisiones' }}</Button></template>
    <template v-if="outcomeBadge" #title-badge>
      <StatusBadge :label="outcomeBadge.label" :tone="outcomeBadge.tone" />
      <span v-if="review.outcome === 'reemplazado'" class="text-sm text-muted-foreground">Hay un envío más reciente · solo consulta</span>
    </template>
    <template #actions>
      <TooltipProvider v-if="review.verified_at">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button type="button" variant="ghost" size="icon" aria-label="Ver PDF" :disabled="openingPdf" @click="openPdf"><Spinner v-if="openingPdf" /><FileText v-else aria-hidden="true" /></Button>
          </TooltipTrigger>
          <TooltipContent>Ver PDF</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button v-if="review.can_comment" type="button" variant="outline" @click="openReturn">Devolver al docente</Button>
      <Button v-if="canSign" type="button" @click="signOpen = true"><FileSignature data-icon="inline-start" aria-hidden="true" />Firmar y aprobar</Button>
    </template>

    <article v-if="fields.length" class="flex flex-col gap-6 rounded-md bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring" aria-label="Bibliografía">
      <section v-for="field in fields" :key="field.key" class="flex min-w-0 flex-col gap-2">
        <h2 class="text-base font-semibold">{{ field.title }}</h2>
        <FreeTextContent :value="field.document ?? field.value" empty-text="Sin completar" />
      </section>
    </article>
    <EmptyState v-else title="Este sílabo no tiene bibliografía." />

    <Dialog v-model:open="returnOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Devolver al docente</DialogTitle>
          <DialogDescription>Marque los motivos para avisar al docente y que lo corrija.</DialogDescription>
        </DialogHeader>
        <form id="library-comment-form" class="flex flex-col gap-4" @submit.prevent="sendReturn">
          <Field :data-invalid="reasonErrors.length > 0">
            <FieldLabel required>Motivos</FieldLabel>
            <div class="flex flex-col gap-3" role="group" aria-label="Motivos de la devolución">
              <div v-for="reason in review.comment_reasons" :key="reason.code" class="flex items-center gap-2 text-sm">
                <Checkbox :id="`library-reason-${reason.code}`" :model-value="selectedReasons.includes(reason.code)" @update:model-value="toggleReason(reason.code, $event)" />
                <label :for="`library-reason-${reason.code}`">{{ reason.label }}</label>
              </div>
            </div>
            <FieldError :errors="reasonErrors" />
          </Field>
          <Field v-if="otherSelected" :data-invalid="otherErrors.length > 0">
            <FieldLabel for="library-other-reason" required>Otro motivo</FieldLabel>
            <Textarea id="library-other-reason" v-model="otherReason" rows="3" maxlength="1000" placeholder="Ej. Falta la edición 2020 del libro de Pressman." />
            <FieldError :errors="otherErrors" />
          </Field>
          <Alert v-if="returnError" variant="destructive" role="alert"><AlertDescription>{{ returnError }}</AlertDescription></Alert>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" :disabled="sending">Cancelar</Button></DialogClose>
            <Button type="submit" variant="destructive" :disabled="sending"><Spinner v-if="sending" data-icon="inline-start" /><MessageSquareText v-else data-icon="inline-start" aria-hidden="true" />Devolver al docente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <SignatureDialog v-model:open="signOpen" title="Firmar y aprobar" confirm-label="Firmar y aprobar" :run="approve" />
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" review-stage="library" />
</template>
