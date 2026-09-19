<script setup lang="ts">
import { LockKeyhole, RotateCcw, ShieldCheck, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  approveReview,
  getReview,
  reopenSyllabus,
  requestCorrection,
  verifyObservation,
  type ReviewDetail,
  type SnapshotField,
} from '@/api/reviews';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import IdentificationCard from '@/components/domain/syllabus/IdentificationCard.vue';
import ReviewObservationSheet from '@/components/domain/syllabus/ReviewObservationSheet.vue';
import SyllabusResetDialog from '@/components/domain/syllabus/SyllabusResetDialog.vue';
import SyllabusTableView from '@/components/domain/syllabus/SyllabusTableView.vue';
import TeacherTransferSheet from '@/components/domain/syllabus/TeacherTransferSheet.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { PlanningExpectations, TableRowData } from '@/lib/tableLayout';
import type { DocumentField } from '@/lib/templateDocument';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const data = ref<ReviewDetail | null>(null);
const loading = ref(true);
const processing = ref(false);
const loadError = ref('');
const actionError = ref('');
const errors = ref<Record<string, string[]>>({});
const selectedObservationIds = ref<string[]>([]);
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
const canReviewCurrent = computed(() => Boolean(data.value?.revision.is_current && data.value?.syllabus.state === 'en_revision'));
const planningExpectations = computed<PlanningExpectations>(() => ({
  teaching_weeks: data.value?.revision.snapshot.academic_context?.scheduled_subject?.teaching_weeks
    ?? data.value?.revision.snapshot.academic_context?.offering?.teaching_weeks ?? null,
  credits: data.value?.revision.snapshot.academic_context?.subject?.credits ?? null,
  total_hours: data.value?.revision.snapshot.academic_context?.subject?.total_hours ?? null,
  hours_acd: data.value?.revision.snapshot.academic_context?.subject?.hours_ac ?? null,
  hours_ape: data.value?.revision.snapshot.academic_context?.subject?.hours_pae ?? null,
  hours_aa: data.value?.revision.snapshot.academic_context?.subject?.hours_aa ?? null,
}));

const toggleObservation = (id: string, checked: boolean | 'indeterminate'): void => {
  if (typeof checked !== 'boolean') return;
  const values = new Set(selectedObservationIds.value);
  if (checked) values.add(id); else values.delete(id);
  selectedObservationIds.value = [...values];
};
const tableRows = (field: SnapshotField): { id: string | null; data: TableRowData }[] => field.rows
  .filter((row) => typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data))
  .map((row) => ({ id: row.id, data: row.data as TableRowData }));
const documentFields = (fields: SnapshotField[]): DocumentField[] => fields.map((field) => ({ ...field, rows: tableRows(field) }));
const formatValue = (value: unknown): string => {
  if (value === null || value === '') return 'Sin contenido';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
const stateLabel = (value: string): string => ({ en_revision: 'En revisión', correccion_solicitada: 'Corrección solicitada', aprobado: 'Aprobado' })[value] ?? 'Estado no disponible';
const observationState = (value: string): string => ({ abierta: 'Abierta', respondida: 'Respondida', verificada: 'Verificada' })[value] ?? 'Estado no disponible';
const submitCorrection = (): Promise<void> => run(() => requestCorrection(data.value!.revision.id, {
  observation_ids: selectedObservationIds.value,
  justification: correctionJustification.value,
}));

onMounted(load);
</script>

<template>
  <PageFrame v-if="data && !loadError" :title="data.syllabus.subject" :description="`${data.syllabus.code} · ${data.syllabus.period} · ${data.syllabus.teachers.join(', ')}`">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.reviews">← Volver a la cola</RouterLink></Button></template>
    <template #meta>
      <Badge variant="secondary">Revisión {{ data.revision.number }}</Badge>
      <Badge variant="outline">{{ stateLabel(data.syllabus.state) }}</Badge>
      <span class="text-sm text-muted-foreground">Enviada por {{ data.revision.submitted_by }} · {{ new Date(data.revision.submitted_at).toLocaleString('es-EC') }}</span>
    </template>
    <template #actions>
      <SyllabusResetDialog v-if="data.reset.allowed && data.revision.is_current" :syllabus-id="data.syllabus.id" :subject="data.syllabus.subject" @saved="changed" />
      <TeacherTransferSheet v-if="data.transfer.allowed && data.transfer.current.length > 0" :syllabus-id="data.syllabus.id" :state="data.syllabus.state" :current="data.transfer.current" :candidates="data.transfer.candidates" @saved="changed" />
    </template>

    <Alert v-if="actionError" variant="destructive"><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <Alert v-if="!data.revision.is_current"><LockKeyhole aria-hidden="true" /><AlertTitle>Está consultando una revisión histórica</AlertTitle><AlertDescription>Esta revisión se conserva tal como fue enviada. Las acciones del flujo solo están disponibles en la revisión vigente.</AlertDescription></Alert>
    <Alert v-if="data.correction_request"><Undo2 aria-hidden="true" /><AlertTitle>Corrección solicitada en esta revisión</AlertTitle><AlertDescription>{{ data.correction_request.justification }}</AlertDescription></Alert>
    <Alert v-if="data.reopening"><RotateCcw aria-hidden="true" /><AlertTitle>El expediente tuvo una reapertura</AlertTitle><AlertDescription>{{ data.reopening.cause }} · {{ data.reopening.reopened_by }} · {{ new Date(data.reopening.reopened_at).toLocaleString('es-EC') }}. La aprobación anterior se conserva.</AlertDescription></Alert>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
      <main class="flex min-w-0 flex-col gap-6">
        <Card v-for="section in data.revision.snapshot.sections" :id="`section-${section.key}`" :key="section.key">
          <CardHeader><CardTitle>{{ section.title }}</CardTitle><CardDescription>Contenido exacto enviado en la revisión {{ data.revision.number }}.</CardDescription></CardHeader>
          <CardContent class="space-y-6">
            <section v-for="block in section.blocks" :key="block.key" class="space-y-4">
              <h3 v-if="section.blocks.length > 1" class="font-medium">{{ block.title }}</h3>
              <TemplateDocumentView v-if="block.document" :document="block.document" :fields="documentFields(block.fields)" :variables="data.revision.snapshot.template_variables ?? {}" :layout="block.table" :planning-expectations="planningExpectations" />
              <dl v-else class="grid gap-4">
                <div v-for="field in block.fields" :key="field.key" class="rounded-md border p-4">
                  <dt class="flex flex-wrap gap-2 font-medium">{{ field.label }}<Badge v-if="field.inherited" variant="outline">Institucional</Badge></dt>
                  <dd v-if="block.content_type === 'institutional' && field.inherited && data.revision.identification" class="mt-3"><IdentificationCard :grid="data.revision.identification" /></dd>
                  <dd v-else-if="field.rows.length === 0" class="mt-2 text-sm whitespace-pre-wrap">{{ formatValue(field.value) }}</dd>
                  <dd v-else-if="block.table" class="mt-3"><SyllabusTableView :layout="block.table" :rows="tableRows(field)" :planning-expectations="planningExpectations" /></dd>
                  <dd v-else class="mt-3 space-y-2"><div v-for="(row, index) in field.rows" :key="row.id" class="rounded bg-muted p-3 text-sm whitespace-pre-wrap"><span class="font-medium">Fila {{ index + 1 }}:</span> {{ formatValue(row.data) }}</div></dd>
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
          <CardContent class="space-y-4">
            <article v-for="observation in data.observations" :key="observation.id" class="space-y-3 rounded-md border p-4">
              <div class="flex flex-wrap items-center gap-2"><Badge variant="outline">Rev. {{ observation.revision_number }}</Badge><Badge :variant="observation.state === 'verificada' ? 'secondary' : 'destructive'">{{ observationState(observation.state) }}</Badge><Badge v-if="observation.requested" variant="outline">Solicitada</Badge></div>
              <p class="text-sm whitespace-pre-wrap">{{ observation.content }}</p>
              <p class="text-xs text-muted-foreground">{{ observation.created_by }} · {{ new Date(observation.observado_en).toLocaleString('es-EC') }}</p>
              <div v-if="observation.response" class="rounded bg-muted p-3 text-sm"><div class="font-medium">Respuesta del docente <span v-if="observation.response.revision_number">· revisión {{ observation.response.revision_number }}</span></div><p class="mt-1 whitespace-pre-wrap">{{ observation.response.content }}</p></div>
              <Button v-if="observation.can_verify" size="sm" variant="outline" :disabled="processing" @click="run(() => verifyObservation(observation.id))"><Spinner v-if="processing" />Marcar verificada</Button>
            </article>
            <p v-if="data.observations.length === 0" class="text-sm text-muted-foreground">Aún no hay observaciones.</p>
          </CardContent>
        </Card>

        <Card v-if="canReviewCurrent && openCurrentObservations.length > 0">
          <CardHeader><CardTitle>Solicitar corrección</CardTitle><CardDescription>Seleccione las observaciones que el docente debe responder.</CardDescription></CardHeader>
          <CardContent><form id="correction-form" class="space-y-4" @submit.prevent="submitCorrection">
            <FieldSet aria-required="true" class="gap-3"><FieldLegend variant="label" required>Observaciones por corregir</FieldLegend>
              <label v-for="observation in openCurrentObservations" :key="observation.id" :for="`correction-observation-${observation.id}`" class="ai-recommendation flex items-start gap-3 rounded-md border p-3 text-sm"><Checkbox :id="`correction-observation-${observation.id}`" :model-value="selectedObservationIds.includes(observation.id)" @update:model-value="toggleObservation(observation.id, $event)" /><span>{{ observation.content }}</span></label>
            </FieldSet>
            <Field><FieldLabel for="correction-justification" required>Justificación para el docente</FieldLabel><Textarea id="correction-justification" v-model="correctionJustification" rows="4" required /><FieldError :errors="[...(errors.observation_ids ?? []), ...(errors.justification ?? [])]" /></Field>
            <Button type="submit" variant="destructive" :disabled="processing || selectedObservationIds.length === 0"><Spinner v-if="processing" /><Undo2 v-else aria-hidden="true" />Solicitar corrección</Button>
          </form></CardContent>
        </Card>

        <Card v-if="canReviewCurrent"><CardHeader><CardTitle>Aprobar revisión</CardTitle><CardDescription>La aprobación quedará vinculada exclusivamente a la revisión {{ data.revision.number }}.</CardDescription></CardHeader><CardContent class="space-y-3"><FieldError :errors="[...(errors.observations ?? []), ...(errors.revision ?? [])]" /><Button :disabled="processing || unresolvedCount > 0" @click="run(() => approveReview(data!.revision.id))"><Spinner v-if="processing" /><ShieldCheck v-else aria-hidden="true" />Aprobar revisión {{ data.revision.number }}</Button><p v-if="unresolvedCount > 0" class="text-sm text-destructive">Verifique todas las observaciones antes de aprobar.</p></CardContent></Card>

        <Card v-if="data.revision.is_current && data.syllabus.state === 'aprobado'"><CardHeader><CardTitle>Reabrir aprobado</CardTitle><CardDescription>Conserva esta aprobación y crea una nueva línea de corrección para el docente.</CardDescription></CardHeader><CardContent><form class="space-y-4" @submit.prevent="run(() => reopenSyllabus(data!.syllabus.id, reopeningCause))"><Field><FieldLabel for="reopening-cause" required>Causa de reapertura</FieldLabel><Textarea id="reopening-cause" v-model="reopeningCause" rows="4" required /><FieldError :errors="errors.cause" /></Field><Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" /><RotateCcw v-else aria-hidden="true" />Reabrir conservando la aprobación</Button></form></CardContent></Card>

        <Card><CardHeader><CardTitle>Historial de revisiones</CardTitle><CardDescription>Consulte o compare revisiones enviadas.</CardDescription></CardHeader><CardContent><ol class="space-y-3"><li v-for="(item, index) in data.history" :key="item.id" class="rounded-md border p-3 text-sm"><div class="flex items-center justify-between gap-3"><Button as-child variant="link" class="h-auto p-0"><RouterLink :to="paths.coordination.review(item.id)">Revisión {{ item.number }}</RouterLink></Button><Badge v-if="item.approved_at" variant="secondary">Aprobada</Badge></div><div class="text-muted-foreground">{{ item.submitted_by }} · {{ new Date(item.submitted_at).toLocaleDateString('es-EC') }}</div><div class="mt-2 flex flex-wrap gap-2"><Button v-if="item.approved_at" as-child size="sm" variant="outline"><RouterLink :to="paths.documents(item.id)">Documentos</RouterLink></Button><Button v-if="index > 0" as-child size="sm" variant="outline"><RouterLink :to="paths.coordination.comparison(data.history[index - 1]!.id, item.id)">Comparar con la anterior</RouterLink></Button></div></li></ol></CardContent></Card>
      </aside>
    </div>
  </PageFrame>
  <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
  <LoadingSkeleton v-else-if="loading" variant="review" />
</template>
