<script setup lang="ts">
import EmptyState from '@/components/domain/EmptyState.vue';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { syllabusStateLabel } from '@/lib/syllabusStates';
import WorkspaceLayout from '@/components/domain/WorkspaceLayout.vue';
import { LockKeyhole, RotateCcw, ShieldCheck, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  approveReview,
  getReview,
  reopenSyllabus,
  requestCorrection,
  type ReviewDetail,
  type SnapshotField,
} from '@/api/reviews';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import ReviewObservationSheet from '@/components/domain/syllabus/ReviewObservationSheet.vue';
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
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const data = ref<ReviewDetail | null>(null);
const loading = ref(true);
const processing = ref(false);
const loadError = ref('');
const actionError = ref('');
const errors = ref<Record<string, string[]>>({});
const correctionJustification = ref('');
const reopeningCause = ref('');

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

const openCurrentObservations = computed(() => data.value?.observations.filter(
  (observation) => observation.revision_number === data.value?.revision.number && observation.state === 'abierta',
) ?? []);
const unresolvedCount = computed(() => data.value?.observations.filter((observation) => observation.state !== 'verificada').length ?? 0);
const canReviewCurrent = computed(() => Boolean(data.value?.decisions_allowed && data.value?.revision.is_current && data.value?.syllabus.state === 'en_revision'));

const documentFields = (fields: SnapshotField[]): DocumentField[] => fields.map((field) => ({ ...field }));
const formatValue = (value: unknown): string => {
  if (value === null || value === '') return 'Sin contenido';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (isFreeTextDocument(value)) return freeTextLines(value);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
const observationState = (value: string): string => ({ abierta: 'Abierta', respondida: 'Respondida', verificada: 'Verificada' })[value] ?? 'Estado no disponible';
const submitCorrection = (): Promise<void> => run(() => requestCorrection(data.value!.revision.id, {
  justification: correctionJustification.value,
}));

onMounted(load);
</script>

<template>
  <PageFrame v-if="data && !loadError" :title="data.syllabus.subject" :description="`${data.syllabus.code} · ${data.syllabus.period} · ${data.syllabus.teachers.join(', ')}`">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.reviews">← Volver a la cola</RouterLink></Button></template>
    <template #meta>
      <Badge variant="secondary">Revisión {{ data.revision.number }}</Badge>
      <Badge variant="outline">{{ syllabusStateLabel(data.syllabus.state) }}</Badge>
      <span class="text-sm text-muted-foreground">Enviada por {{ data.revision.submitted_by }} · {{ formatDateDisplay(data.revision.submitted_at) }}</span>
    </template>
    <template #actions>
      <SyllabusResetDialog v-if="data.reset.allowed && data.revision.is_current" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @saved="changed" />
    </template>

    <Alert v-if="actionError" variant="destructive"><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <Alert v-if="!data.decisions_allowed"><LockKeyhole aria-hidden="true" /><AlertTitle>Convocatoria cerrada</AlertTitle><AlertDescription>La revisión queda solo para consulta: ya no se pueden registrar observaciones, solicitar correcciones, aprobar, reabrir ni reiniciar.</AlertDescription></Alert>
    <Alert v-if="!data.revision.is_current"><LockKeyhole aria-hidden="true" /><AlertTitle>Está consultando una revisión histórica</AlertTitle><AlertDescription>Esta revisión se conserva tal como fue enviada. Las acciones del flujo solo están disponibles en la revisión vigente.</AlertDescription></Alert>
    <Alert v-if="data.correction_request"><Undo2 aria-hidden="true" /><AlertTitle>Corrección solicitada en esta revisión</AlertTitle><AlertDescription>{{ data.correction_request.justification }}</AlertDescription></Alert>
    <Alert v-if="data.reopening"><RotateCcw aria-hidden="true" /><AlertTitle>El expediente tuvo una reapertura</AlertTitle><AlertDescription>{{ data.reopening.cause }} · {{ data.reopening.reopened_by }} · {{ formatDateDisplay(data.reopening.reopened_at) }}. La aprobación anterior se conserva.</AlertDescription></Alert>

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
        <ReviewObservationSheet v-if="canReviewCurrent" :revision-id="data.revision.id" :sections="data.revision.snapshot.sections" @saved="changed" />
        <Card>
          <CardHeader><CardTitle>Observaciones</CardTitle><CardDescription>{{ unresolvedCount }} pendiente(s) en todo el historial.</CardDescription></CardHeader>
          <CardContent class="flex flex-col gap-4">
            <article v-for="observation in data.observations" :key="observation.id" class="flex flex-col gap-3 rounded-md border p-4">
              <div class="flex flex-wrap items-center gap-2"><Badge variant="outline">Rev. {{ observation.revision_number }}</Badge><Badge :variant="observation.state === 'verificada' ? 'secondary' : 'destructive'">{{ observationState(observation.state) }}</Badge><Badge v-if="observation.requested" variant="outline">Solicitada</Badge></div>
              <p class="text-sm whitespace-pre-wrap">{{ observation.content }}</p>
              <p class="text-xs text-muted-foreground">{{ observation.created_by }} · {{ formatDateDisplay(observation.observado_en) }}</p>
            </article>
            <EmptyState v-if="data.observations.length === 0" title="Aún no hay observaciones." />
          </CardContent>
        </Card>

        <Card v-if="canReviewCurrent && openCurrentObservations.length > 0">
          <CardHeader><CardTitle>Solicitar corrección</CardTitle><CardDescription>{{ openCurrentObservations.length === 1 ? 'Se enviará al docente la observación pendiente de esta revisión.' : `Se enviarán al docente las ${openCurrentObservations.length} observaciones pendientes de esta revisión.` }}</CardDescription></CardHeader>
          <CardContent><form id="correction-form" class="flex flex-col gap-4" @submit.prevent="submitCorrection">
            <ul class="flex flex-col gap-2" aria-label="Observaciones que se enviarán">
              <li v-for="observation in openCurrentObservations" :key="observation.id" class="rounded-md border p-3 text-sm whitespace-pre-wrap">{{ observation.content }}</li>
            </ul>
            <Field><FieldLabel for="correction-justification" required>Justificación para el docente</FieldLabel><Textarea id="correction-justification" v-model="correctionJustification" rows="4" required /><FieldError :errors="[...(errors.revision ?? []), ...(errors.justification ?? [])]" /></Field>
            <Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" /><Undo2 v-else aria-hidden="true" />Solicitar corrección</Button>
          </form></CardContent>
        </Card>

        <Card v-if="canReviewCurrent"><CardHeader><CardTitle>Aprobar revisión</CardTitle><CardDescription>La aprobación quedará vinculada exclusivamente a la revisión {{ data.revision.number }}.</CardDescription></CardHeader><CardContent class="flex flex-col gap-3"><FieldError :errors="errors.revision" /><Button :disabled="processing" @click="run(() => approveReview(data!.revision.id))"><Spinner v-if="processing" /><ShieldCheck v-else aria-hidden="true" />Aprobar revisión {{ data.revision.number }}</Button><p v-if="unresolvedCount > 0" class="text-sm text-muted-foreground">Al aprobar, las {{ unresolvedCount }} observación(es) pendiente(s) se darán por resueltas.</p></CardContent></Card>

        <DocumentSignatureCard v-if="data.history.some((item) => item.id === data!.revision.id && item.approved_at)" :key="data.revision.id" :revision-id="data.revision.id" :file-name="`silabo-${data.syllabus.code}-revision-${data.revision.number}`" />

        <Card v-if="data.decisions_allowed && data.revision.is_current && data.syllabus.state === 'aprobado'"><CardHeader><CardTitle>Reabrir aprobado</CardTitle><CardDescription>Conserva esta aprobación y crea una nueva línea de corrección para el docente.</CardDescription></CardHeader><CardContent><form class="flex flex-col gap-4" @submit.prevent="run(() => reopenSyllabus(data!.syllabus.id, reopeningCause))"><Field><FieldLabel for="reopening-cause" required>Causa de reapertura</FieldLabel><Textarea id="reopening-cause" v-model="reopeningCause" rows="4" required /><FieldError :errors="errors.cause" /></Field><Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" /><RotateCcw v-else aria-hidden="true" />Reabrir conservando la aprobación</Button></form></CardContent></Card>

        <Card><CardHeader><CardTitle>Historial de revisiones</CardTitle><CardDescription>Consulte o compare revisiones enviadas.</CardDescription></CardHeader><CardContent><ol class="flex flex-col gap-3"><li v-for="(item, index) in data.history" :key="item.id" class="rounded-md border p-3 text-sm"><div class="flex items-center justify-between gap-3"><Button as-child variant="link" class="h-auto p-0"><RouterLink :to="paths.coordination.review(item.id)">Revisión {{ item.number }}</RouterLink></Button><Badge v-if="item.approved_at" variant="secondary">Aprobada</Badge></div><div class="text-muted-foreground">{{ item.submitted_by }} · {{ formatDateDisplay(item.submitted_at, { dateStyle: 'medium' }) }}</div><div class="mt-2 flex flex-wrap gap-2"><Button v-if="item.approved_at" as-child size="sm" variant="outline"><RouterLink :to="paths.documents(item.id)">Documentos</RouterLink></Button><Button v-if="index > 0" as-child size="sm" variant="outline"><RouterLink :to="paths.coordination.comparison(data.history[index - 1]!.id, item.id)">Comparar con la anterior</RouterLink></Button></div></li></ol></CardContent></Card>
      </aside>
    </WorkspaceLayout>
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" />
</template>
