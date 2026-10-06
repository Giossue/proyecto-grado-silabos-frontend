<script setup lang="ts">
import { formatDateDisplay } from '@/lib/dateDisplay';
import { syllabusStateLabel } from '@/lib/syllabusStates';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import { ArrowLeft, LockKeyhole, ShieldCheck, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  approveReview,
  getReview,
  requestCorrection,
  reviewStageLabel,
  type ReviewDetail,
  type SnapshotField,
} from '@/api/reviews';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import SyllabusDeleteDialog from '@/components/domain/syllabus/SyllabusDeleteDialog.vue';
import SyllabusResetDialog from '@/components/domain/syllabus/SyllabusResetDialog.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentField } from '@/lib/templateDocument';
import { freeTextLines, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import { paths, reviewAreaPaths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const router = useRouter();
const data = ref<ReviewDetail | null>(null);
const area = computed(() => reviewAreaPaths());
const loading = ref(true);
const processing = ref(false);
const loadError = ref('');
const actionError = ref('');
const errors = ref<Record<string, string[]>>({});
const correctionJustification = ref('');

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

const changed = async (value: string): Promise<void> => {
  toast.success(value);
  await load();
};

const run = async (action: () => Promise<{ message: string }>): Promise<void> => {
  processing.value = true;
  actionError.value = '';
  errors.value = {};
  try {
    const result = await action();
    toast.success(result.message);
    await load();
  } catch (failure) {
    if (failure instanceof ApiError) {
      actionError.value = failure.message;
      errors.value = failure.errors;
    } else {
      actionError.value = 'No se pudo completar la acción.';
    }
  } finally {
    processing.value = false;
  }
};

const canReviewCurrent = computed(() => Boolean(data.value?.can_decide && data.value?.revision.is_current && data.value?.syllabus.state === 'en_revision'));
const stageLabel = computed(() => reviewStageLabel(data.value?.syllabus.stage));
const canDelete = computed(() => Boolean(data.value?.can_delete && data.value?.revision.is_current));
const deleted = async (message: string): Promise<void> => {
  toast.success(message);
  await router.replace(area.value.reviews);
};

const documentFields = (fields: SnapshotField[]): DocumentField[] => fields.map((field) => ({ ...field }));
const formatValue = (value: unknown): string => {
  if (value === null || value === '') return 'Sin contenido';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (isFreeTextDocument(value)) return freeTextLines(value);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
const submitCorrection = (): Promise<void> => run(() => requestCorrection(data.value!.revision.id, {
  justification: correctionJustification.value,
}));

onMounted(load);
</script>

<template>
  <PageFrame v-if="data && !loadError" :title="data.syllabus.subject" :description="`${data.syllabus.code} · ${data.syllabus.period} · ${data.syllabus.teachers.join(', ')}`">
    <template #eyebrow><Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="area.reviews"><ArrowLeft aria-hidden="true" />Volver a la cola</RouterLink></Button></template>
    <template #meta>
      <Badge variant="secondary">Revisión {{ data.revision.number }}</Badge>
      <Badge variant="outline">{{ syllabusStateLabel(data.syllabus.state) }}</Badge>
      <Badge v-if="stageLabel" variant="outline">{{ stageLabel }}</Badge>
      <span class="text-sm text-muted-foreground">Enviada por {{ data.revision.submitted_by }} · {{ formatDateDisplay(data.revision.submitted_at) }}</span>
    </template>
    <template #actions>
      <SyllabusResetDialog v-if="data.reset.allowed && data.revision.is_current" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @saved="changed" />
    </template>

    <Alert v-if="actionError" variant="destructive"><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <Alert v-if="!data.decisions_allowed"><LockKeyhole aria-hidden="true" /><AlertTitle>Convocatoria cerrada</AlertTitle><AlertDescription>La revisión queda solo para consulta: ya no se pueden solicitar correcciones, aprobar, eliminar ni reiniciar.</AlertDescription></Alert>
    <Alert v-if="!data.revision.is_current"><LockKeyhole aria-hidden="true" /><AlertTitle>Está consultando una revisión histórica</AlertTitle><AlertDescription>Esta revisión se conserva tal como fue enviada. Las acciones del flujo solo están disponibles en la revisión vigente.</AlertDescription></Alert>
    <Alert v-if="data.revision.is_current && data.syllabus.state === 'en_revision' && !canReviewCurrent && data.decisions_allowed"><LockKeyhole aria-hidden="true" /><AlertTitle>{{ stageLabel || 'En revisión' }}</AlertTitle><AlertDescription>Esta revisión la tiene ahora otro revisor. Podrá decidir cuando llegue a su etapa.</AlertDescription></Alert>
    <Alert v-if="data.correction_request"><Undo2 aria-hidden="true" /><AlertTitle>Corrección solicitada en esta revisión<template v-if="data.correction_request.stage"> ({{ reviewStageLabel(data.correction_request.stage).replace('En ', '') }})</template></AlertTitle><AlertDescription>{{ data.correction_request.justification }}<template v-if="data.correction_request.requested_by"> · {{ data.correction_request.requested_by }}</template></AlertDescription></Alert>

    <WorkspaceLayout variant="review">
      <main class="flex min-w-0 flex-col gap-6">
        <Card v-for="section in data.revision.snapshot.sections" :id="`section-${section.key}`" :key="section.key">
          <CardHeader><CardTitle>{{ section.title }}</CardTitle><CardDescription>Contenido exacto enviado en la revisión {{ data.revision.number }}.</CardDescription></CardHeader>
          <CardContent class="flex flex-col gap-6">
            <section v-for="block in section.blocks" :key="block.key" class="flex flex-col gap-4">
              <h3 v-if="section.blocks.length > 1" class="font-medium">{{ block.title }}</h3>
              <TemplateDocumentView v-if="block.document" :document="block.document" :fields="documentFields(block.fields)" :variables="data.revision.snapshot.template_variables ?? {}" />
              <dl v-else class="grid gap-4">
                <div v-for="field in block.fields" :key="field.key" class="rounded-md border p-4">
                  <dt class="flex flex-wrap gap-2 font-medium">{{ field.label }}<Badge v-if="field.inherited" variant="outline">Institucional</Badge></dt>
                  <dd class="mt-2 text-sm whitespace-pre-wrap">{{ formatValue(field.value) }}</dd>
                </div>
              </dl>
            </section>
          </CardContent>
        </Card>
      </main>

      <aside class="flex min-w-0 flex-col gap-6">
        <Card v-if="canReviewCurrent">
          <CardHeader><CardTitle>Solicitar corrección</CardTitle><CardDescription>El sílabo vuelve al docente con su comentario; al reenviarlo pasa otra vez por biblioteca.</CardDescription></CardHeader>
          <CardContent><form id="correction-form" class="flex flex-col gap-4" @submit.prevent="submitCorrection">
            <Field><FieldLabel for="correction-justification" required>Comentario para el docente</FieldLabel><Textarea id="correction-justification" v-model="correctionJustification" rows="4" required /><FieldError :errors="[...(errors.revision ?? []), ...(errors.justification ?? [])]" /></Field>
            <Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" /><Undo2 v-else aria-hidden="true" />Solicitar corrección</Button>
          </form></CardContent>
        </Card>

        <Card v-if="canReviewCurrent"><CardHeader><CardTitle>Aprobar revisión</CardTitle><CardDescription>La aprobación fija la revisión {{ data.revision.number }} y genera el PDF para las firmas.</CardDescription></CardHeader><CardContent class="flex flex-col gap-3"><FieldError :errors="errors.revision" /><Button :disabled="processing" @click="run(() => approveReview(data!.revision.id))"><Spinner v-if="processing" /><ShieldCheck v-else aria-hidden="true" />Aprobar revisión {{ data.revision.number }}</Button></CardContent></Card>

        <DocumentSignatureCard v-if="data.history.some((item) => item.id === data!.revision.id && item.approved_at)" :key="data.revision.id" :revision-id="data.revision.id" :file-name="`silabo-${data.syllabus.code}-revision-${data.revision.number}`" />

        <Card v-if="canDelete"><CardHeader><CardTitle>Eliminar sílabo aprobado</CardTitle><CardDescription>Un sílabo aprobado no se modifica. Si hay un error, elimínelo con todo su historial: el docente empieza de cero.</CardDescription></CardHeader><CardContent><SyllabusDeleteDialog :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @deleted="deleted" /></CardContent></Card>

        <Card><CardHeader><CardTitle>Historial de revisiones</CardTitle><CardDescription>Consulte o compare revisiones enviadas.</CardDescription></CardHeader><CardContent><ol class="flex flex-col gap-3"><li v-for="(item, index) in data.history" :key="item.id" class="rounded-md border p-3 text-sm"><div class="flex items-center justify-between gap-3"><Button as-child variant="link" class="h-auto p-0"><RouterLink :to="area.review(item.id)">Revisión {{ item.number }}</RouterLink></Button><Badge v-if="item.approved_at" variant="secondary">Aprobada</Badge></div><div v-if="item.library_verified_at || item.approved_at" class="mt-1 text-muted-foreground"><template v-if="item.library_verified_at">Biblioteca: {{ item.library_verified_by }}. </template><template v-if="item.approved_at">Coordinación: {{ item.approved_by }}.</template></div><div class="text-muted-foreground">{{ item.submitted_by }} · {{ formatDateDisplay(item.submitted_at, { dateStyle: 'medium' }) }}</div><div class="mt-2 flex flex-wrap gap-2"><Button v-if="item.approved_at" as-child size="sm" variant="outline"><RouterLink :to="paths.documents(item.id)">Documentos</RouterLink></Button><Button v-if="index > 0" as-child size="sm" variant="outline"><RouterLink :to="area.comparison(data.history[index - 1]!.id, item.id)">Comparar con la anterior</RouterLink></Button></div></li></ol></CardContent></Card>
      </aside>
    </WorkspaceLayout>
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" review-stage="coordination" />
</template>
