<script setup lang="ts">
import CommentEntry from '@/components/domain/CommentEntry.vue';
import EmptyState from '@/components/domain/EmptyState.vue';
import { formatDateDisplay } from '@/lib/dateDisplay';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import { ArrowLeft, BookCheck, CircleSlash, MessageSquareText } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, verifyLibraryReview, type LibraryReviewDetail } from '@/api/library';
import type { SnapshotField } from '@/api/reviews';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { freeTextLines, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { libraryStateLabel, libraryStateVariant } from '@/lib/libraryStates';
import { paths } from '@/lib/routes';
import type { DocumentField } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';

const route = useRoute();
const review = ref<LibraryReviewDetail | null>(null);
const loading = ref(true);
const loadError = ref('');
const comment = ref('');
const commentErrors = ref<string[]>([]);
const actionError = ref('');
const confirmOpen = ref(false);
const sending = ref(false);
const idempotencyKey = ref('');
const verifyOpen = ref(false);
const verifying = ref(false);
const verifyKey = ref('');

const formatDate = (value: string): string =>
  formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' });
const documentFields = (fields: SnapshotField[]): DocumentField[] => fields.map((field) => ({ ...field }));
const formatValue = (value: unknown): string => {
  if (value === null || value === '') return 'Sin contenido';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (isFreeTextDocument(value)) return freeTextLines(value);
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
const comments = computed(() => [...(review.value?.comments ?? [])].sort(
  (left, right) => new Date(right.commented_at).getTime() - new Date(left.commented_at).getTime(),
));

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = '';
  try {
    review.value = (await getLibraryReview(String(route.params.revision))).review;
  } catch (failure) {
    loadError.value = failure instanceof ApiError ? failure.message : 'No se pudo cargar la revisión de bibliografía.';
  } finally {
    loading.value = false;
  }
};

const askConfirmation = (): void => {
  commentErrors.value = [];
  actionError.value = '';
  if (comment.value.trim() === '') {
    commentErrors.value = ['Escriba qué libros no están disponibles o qué debe corregir el docente.'];
    return;
  }
  idempotencyKey.value = crypto.randomUUID();
  confirmOpen.value = true;
};

const sendComment = async (): Promise<void> => {
  if (!review.value) return;
  sending.value = true;
  actionError.value = '';
  try {
    const result = await commentLibraryReview(review.value.revision_id, {
      comment: comment.value.trim(),
      idempotency_key: idempotencyKey.value,
    });
    confirmOpen.value = false;
    comment.value = '';
    toast.success(result.message);
    await load();
  } catch (failure) {
    if (failure instanceof ApiError) {
      commentErrors.value = failure.errors.comment ?? [];
      actionError.value = failure.message;
    } else {
      actionError.value = 'No se pudo enviar el comentario.';
    }
    confirmOpen.value = false;
  } finally {
    sending.value = false;
  }
};

const askVerify = (): void => {
  actionError.value = '';
  verifyKey.value = crypto.randomUUID();
  verifyOpen.value = true;
};

const verify = async (): Promise<void> => {
  if (!review.value) return;
  verifying.value = true;
  actionError.value = '';
  try {
    const result = await verifyLibraryReview(review.value.revision_id, verifyKey.value);
    verifyOpen.value = false;
    toast.success(result.message);
    await load();
  } catch (failure) {
    actionError.value = failure instanceof ApiError ? failure.message : 'No se pudo aprobar la bibliografía.';
    verifyOpen.value = false;
  } finally {
    verifying.value = false;
  }
};

watch(() => route.params.revision, (current, previous) => { if (current !== previous) void load(); });
onMounted(load);
</script>

<template>
  <PageFrame
    v-if="review && !loadError"
    :title="review.subject"
    :description="`${review.code} · ${review.career} · ${review.period} · Paralelo(s) ${review.parallels.join(', ')} · ${review.teachers.join(', ')}`"
  >
    <template #eyebrow><Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="paths.library.reviews"><ArrowLeft aria-hidden="true" />Volver a revisiones</RouterLink></Button></template>
    <template #meta>
      <Badge variant="secondary">Revisión {{ review.revision_number }}</Badge>
      <Badge :variant="libraryStateVariant(review.state)">{{ libraryStateLabel(review.state) }}</Badge>
      <span class="text-sm text-muted-foreground">Enviado por {{ review.sent_by }} · {{ formatDate(review.sent_at) }}</span>
    </template>

    <Alert v-if="actionError" variant="destructive"><AlertTitle>No se pudo completar la acción</AlertTitle><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <Alert v-if="review.state === 'firmado'"><BookCheck aria-hidden="true" /><AlertTitle>Bibliografía verificada</AlertTitle><AlertDescription>Biblioteca ya firmó este sílabo.</AlertDescription></Alert>
    <Alert v-else-if="review.state === 'por_firmar'"><BookCheck aria-hidden="true" /><AlertTitle>Bibliografía aprobada</AlertTitle><AlertDescription>Aprobada<template v-if="review.verified_by"> por {{ review.verified_by }}</template><template v-if="review.verified_at"> el {{ formatDate(review.verified_at) }}</template>. Firme el PDF cuando docente y coordinación hayan firmado.</AlertDescription></Alert>
    <Alert v-else-if="review.state === 'comentado'"><MessageSquareText aria-hidden="true" /><AlertTitle>Comentario enviado al docente</AlertTitle><AlertDescription>El docente corregirá la bibliografía. El sílabo volverá a esta bandeja para una nueva verificación.</AlertDescription></Alert>
    <Alert v-else-if="review.state === 'anulado'"><CircleSlash aria-hidden="true" /><AlertTitle>Envío anulado</AlertTitle><AlertDescription>El sílabo se reabrió después de este envío. Esta revisión queda solo para consulta.</AlertDescription></Alert>

    <WorkspaceLayout variant="review">
      <main class="flex min-w-0 flex-col gap-6">
        <Card v-for="section in review.sections" :id="`section-${section.key}`" :key="section.key">
          <CardHeader><CardTitle>{{ section.title }}</CardTitle><CardDescription>Libros que propuso el docente en la revisión {{ review.revision_number }}. Solo lectura.</CardDescription></CardHeader>
          <CardContent class="flex flex-col gap-6">
            <section v-for="block in section.blocks" :key="block.key" class="flex flex-col gap-4">
              <h3 v-if="section.blocks.length > 1" class="font-medium">{{ block.title }}</h3>
              <TemplateDocumentView v-if="block.document" :document="block.document" :fields="documentFields(block.fields)" :variables="review.template_variables" />
              <dl v-else class="grid gap-4">
                <div v-for="field in block.fields" :key="field.key" class="rounded-md border p-4">
                  <dt class="font-medium">{{ field.label }}</dt>
                  <dd class="mt-2 text-sm whitespace-pre-wrap">{{ formatValue(field.value) }}</dd>
                </div>
              </dl>
            </section>
          </CardContent>
        </Card>
        <Card v-if="review.sections.length === 0">
          <CardHeader><CardTitle>Bibliografía</CardTitle><CardDescription>Este sílabo no tiene una sección de Bibliografía en su plantilla.</CardDescription></CardHeader>
        </Card>
      </main>

      <aside class="flex min-w-0 flex-col gap-6">
        <Card v-if="review.can_verify">
          <CardHeader><CardTitle>Aprobar bibliografía</CardTitle><CardDescription>Si todos los libros están en biblioteca, apruebe la bibliografía. Después el docente genera el PDF y lo firman docente, coordinación y biblioteca.</CardDescription></CardHeader>
          <CardContent><Button type="button" :disabled="verifying" @click="askVerify"><BookCheck data-icon="inline-start" aria-hidden="true" />Aprobar bibliografía</Button></CardContent>
        </Card>

        <DocumentSignatureCard v-if="['por_firmar', 'firmado'].includes(review.state)" :key="review.revision_id" :revision-id="review.revision_id" :file-name="`silabo-${review.code}-revision-${review.revision_number}`" @changed="load" />

        <Card v-if="review.can_comment">
          <CardHeader><CardTitle>Enviar comentario</CardTitle><CardDescription>Si algún libro no está en biblioteca, explíquelo al docente. El sílabo vuelve al docente para que corrija solo la bibliografía.</CardDescription></CardHeader>
          <CardContent>
            <form id="library-comment-form" class="flex flex-col gap-4" @submit.prevent="askConfirmation">
              <Field :data-invalid="commentErrors.length > 0">
                <FieldLabel for="library-comment" required>Comentario para el docente</FieldLabel>
                <Textarea id="library-comment" v-model="comment" rows="4" :aria-invalid="commentErrors.length > 0" placeholder="Ej. El libro «Ingeniería de software» de Sommerville no está en biblioteca; proponga otra edición disponible." />
                <FieldDescription>El docente verá este texto en su sílabo.</FieldDescription>
                <FieldError :errors="commentErrors" />
              </Field>
              <Button type="submit" variant="destructive" :disabled="sending"><MessageSquareText data-icon="inline-start" aria-hidden="true" />Enviar comentario</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Comentarios de biblioteca</CardTitle><CardDescription>Historial de comentarios enviados al docente.</CardDescription></CardHeader>
          <CardContent class="flex flex-col gap-3">
            <CommentEntry v-for="(item, index) in comments" :key="`${item.commented_at}-${index}`" :revision="item.revision_number" :content="item.comment" :author="item.commented_by" :date="item.commented_at" />
            <EmptyState v-if="comments.length === 0" title="Aún no hay comentarios." />
          </CardContent>
        </Card>
      </aside>
    </WorkspaceLayout>

    <Dialog v-model:open="confirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Enviar comentario al docente?</DialogTitle>
          <DialogDescription>El sílabo vuelve al docente para que corrija solo la bibliografía. Cuando el docente la reenvíe, volverá a esta bandeja para una nueva verificación, sin pasar por coordinación.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="sending">Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" :disabled="sending" @click="sendComment"><Spinner v-if="sending" data-icon="inline-start" /><MessageSquareText v-else data-icon="inline-start" aria-hidden="true" />Enviar comentario</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog v-model:open="verifyOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Aprobar la bibliografía?</DialogTitle>
          <DialogDescription>Confirma que los libros están disponibles en biblioteca. El docente podrá generar el PDF y empezar las firmas; biblioteca firmará al final.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="verifying">Cancelar</Button></DialogClose>
          <Button type="button" :disabled="verifying" @click="verify"><Spinner v-if="verifying" data-icon="inline-start" /><BookCheck v-else data-icon="inline-start" aria-hidden="true" />Aprobar bibliografía</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" />
</template>
