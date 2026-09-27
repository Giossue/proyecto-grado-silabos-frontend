<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { PURGE_CANCELLED_MESSAGE } from '@/api/career-academics';
import { applyCurricularImport, type CurricularDefinition, type CurricularImportDetail, type CurricularImportIndex, type CurricularProposedValue } from '@/api/curricular-imports';
import CurricularValuePreview from './CurricularValuePreview.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ detail: CurricularImportDetail; subjects: CurricularImportIndex['subjects'] }>();
const emit = defineEmits<{ applied: [detail: CurricularImportDetail, message: string] }>();
const selected = ref<string[]>([]);
const assignments = ref<Record<string, string>>({});
const acceptedConflicts = ref<Record<string, boolean>>({});
const confirmed = ref(false);
const saving = ref(false);
const conflict = ref(false);
const error = ref<string | null>(null);
const errors = ref<string[]>([]);
const editable = computed(() => props.detail.status === 'lista' && props.detail.editable && !props.detail.lock_reason && !conflict.value);
const definitions = computed(() => new Map(props.detail.proposal?.definitions.map((definition) => [definition.key, definition]) ?? []));
const definition = (item: CurricularProposedValue): CurricularDefinition | undefined => definitions.value.get(item.concept_key);
const subjectId = (item: CurricularProposedValue): string | null => assignments.value[item.id] || item.subject_id;
const problem = (item: CurricularProposedValue): string | null => {
  const concept = definition(item);
  if (!concept) return 'No se pudo identificar el tipo de dato. Esta propuesta necesita revisión.';
  if (item.issue_code === 'source_conflict' && !acceptedConflicts.value[item.id]) return item.issue || 'La fuente discrepa de otro dato. Revisa la discrepancia antes de elegir esta propuesta.';
  if ((item.issue || item.issue_code) && !['subject_unmatched', 'source_conflict'].includes(item.issue_code ?? '')) return item.issue || 'Este dato requiere corregir su contenido o evidencia antes de aplicarlo.';
  if (concept.scope === 'asignatura' && !props.subjects.some((subject) => subject.id === subjectId(item))) return 'Elige la asignatura de la malla a la que pertenece este dato.';
  if (!item.evidence.length) return 'La propuesta no incluye evidencia suficiente.';
  return null;
};
const selectedItems = computed(() => props.detail.proposal?.values.filter((item) => selected.value.includes(item.id)) ?? []);
const duplicateSelection = computed(() => {
  const identities = selectedItems.value.map((item) => `${item.concept_key}:${definition(item)?.scope === 'carrera' ? 'career' : subjectId(item)}`);
  return new Set(identities).size !== identities.length;
});
const canApply = computed(() => editable.value && !saving.value && Boolean(props.detail.fingerprint) && confirmed.value && !duplicateSelection.value && selectedItems.value.length > 0 && selectedItems.value.every((item) => !problem(item)));
const groups = computed(() => {
  const result = new Map<string, { label: string; items: CurricularProposedValue[] }>();
  for (const item of props.detail.proposal?.values ?? []) {
    const subject = props.subjects.find((subject) => subject.id === subjectId(item));
    const label = definition(item)?.scope === 'carrera' ? 'Datos de la carrera' : subject ? `${subject.code} · ${subject.name}` : item.subject_name || 'Asignatura por identificar';
    const key = definition(item)?.scope === 'carrera' ? 'career' : subjectId(item) ?? `unmatched:${item.subject_name ?? item.id}`;
    if (!result.has(key)) result.set(key, { label, items: [] });
    result.get(key)!.items.push(item);
  }
  return [...result.entries()];
});
const sourceName = (id: string): string => props.detail.documents.find((document) => document.source_id === id)?.name ?? 'Documento fuente';
const choose = (id: string, value: boolean | 'indeterminate') => {
  selected.value = value === true ? [...selected.value.filter((item) => item !== id), id] : selected.value.filter((item) => item !== id);
};
watch(() => [props.detail.id, props.detail.fingerprint], () => {
  assignments.value = Object.fromEntries((props.detail.applied_items ?? []).filter((item) => item.subject_id).map((item) => [item.id, item.subject_id!]));
  acceptedConflicts.value = Object.fromEntries((props.detail.applied_items ?? []).map((item) => [item.id, item.accept_conflict]));
  selected.value = props.detail.proposal?.values.filter((item) => !problem(item)).map((item) => item.id) ?? [];
  confirmed.value = false;
  conflict.value = false;
  error.value = null;
  errors.value = [];
}, { immediate: true });
watch([selected, assignments, acceptedConflicts], () => { confirmed.value = false; }, { deep: true, flush: 'sync' });

const apply = async () => {
  if (!canApply.value || !props.detail.fingerprint) return;
  saving.value = true;
  error.value = null;
  errors.value = [];
  try {
    const result = await applyCurricularImport(props.detail.id, {
      expected_fingerprint: props.detail.fingerprint,
      confirmed: true,
      items: selectedItems.value.map((item) => ({ id: item.id, ...(assignments.value[item.id] ? { subject_id: assignments.value[item.id] } : {}), ...(item.issue_code === 'source_conflict' && acceptedConflicts.value[item.id] ? { accept_conflict: true as const } : {}) })),
    });
    emit('applied', result, result.message);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron guardar los datos seleccionados.';
    errors.value = reason instanceof ApiError ? Object.values(reason.errors).flat() : [];
    if (reason instanceof ApiError && reason.status === 409 && reason.message !== PURGE_CANCELLED_MESSAGE) conflict.value = true;
  } finally { saving.value = false; }
};
</script>

<template>
  <FieldGroup>
    <Alert v-if="detail.lock_reason || detail.status === 'aplicada'"><AlertDescription>{{ detail.lock_reason ?? 'Los datos seleccionados de esta propuesta ya se guardaron en la carrera.' }}</AlertDescription></Alert>
    <Alert v-if="detail.proposal?.issues.length"><AlertDescription><ul class="flex list-disc flex-col gap-1 pl-4"><li v-for="(issue, index) in detail.proposal.issues" :key="index">{{ issue }}</li></ul></AlertDescription></Alert>
    <div v-if="detail.proposal?.definitions.length" class="flex flex-col gap-2">
      <h3 class="text-sm font-medium">Datos encontrados</h3>
      <div class="flex flex-wrap gap-2"><Badge v-for="concept in detail.proposal.definitions" :key="concept.key" variant="secondary">{{ concept.label }} · {{ { texto: 'Texto', lista: 'Lista', tabla: 'Tabla' }[concept.type] }} · {{ concept.scope === 'carrera' ? 'Carrera' : 'Asignatura' }}</Badge></div>
    </div>
    <Empty v-if="!groups.length"><EmptyHeader><EmptyTitle>Sin datos propuestos</EmptyTitle><EmptyDescription>Los documentos no produjeron datos que puedan asociarse a la carrera o sus asignaturas.</EmptyDescription></EmptyHeader></Empty>
    <section v-for="[key, group] in groups" :key="key" class="flex min-w-0 flex-col gap-4">
      <h3 class="break-words font-medium">{{ group.label }}</h3>
      <FieldGroup class="gap-5">
        <Field v-for="item in group.items" :key="item.id" class="min-w-0" :data-invalid="Boolean(problem(item))">
          <Field orientation="horizontal">
            <Checkbox v-if="detail.status === 'lista'" :id="`proposal-${item.id}`" :model-value="selected.includes(item.id)" :disabled="!editable || saving || Boolean(problem(item))" @update:model-value="choose(item.id, $event)" />
            <FieldLabel v-if="detail.status === 'lista'" :for="`proposal-${item.id}`">{{ definition(item)?.label ?? 'Dato por identificar' }}</FieldLabel>
            <template v-else><h4 class="text-sm font-medium">{{ definition(item)?.label ?? 'Dato por identificar' }}</h4><Badge :variant="detail.applied_items?.some((applied) => applied.id === item.id) ? 'secondary' : 'outline'">{{ detail.applied_items?.some((applied) => applied.id === item.id) ? 'Guardado' : 'Sin aplicar' }}</Badge></template>
          </Field>
          <template v-if="detail.status === 'lista'">
            <Badge v-if="item.change" :variant="item.change === 'replace' ? 'outline' : 'secondary'" class="w-fit">{{ { new: 'Dato nuevo', unchanged: 'Sin cambio de contenido', replace: 'Reemplaza el dato vigente' }[item.change] }}</Badge>
            <div v-if="item.change === 'replace' && item.current_value !== null && item.current_value !== undefined" class="flex flex-col gap-2 border-l-2 pl-3">
              <p class="text-sm font-medium">Dato vigente</p>
              <CurricularValuePreview :definition="definition(item)" :value="item.current_value" />
            </div>
            <p v-if="item.change === 'replace'" class="text-sm font-medium">Propuesta del documento</p>
            <p v-if="item.change === 'unchanged'" class="text-sm text-muted-foreground">El contenido coincide. Al aplicarlo se registrará la procedencia de esta importación.</p>
          </template>
          <CurricularValuePreview :definition="definition(item)" :value="item.value" />
          <Field v-if="(item.issue_code === 'subject_unmatched' || (item.issue_code === 'source_conflict' && definition(item)?.scope === 'asignatura' && !item.subject_id)) && detail.status === 'lista'">
            <FieldLabel :for="`proposal-subject-${item.id}`">Asignatura en la malla</FieldLabel>
            <Select v-model="assignments[item.id]" :disabled="!editable || saving"><SelectTrigger :id="`proposal-subject-${item.id}`"><SelectValue placeholder="Selecciona la asignatura" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.code }} · {{ subject.name }}</SelectItem></SelectGroup></SelectContent></Select>
          </Field>
          <Alert v-if="detail.status === 'lista' && definition(item)?.scope === 'asignatura' && !item.subject_id && assignments[item.id]"><AlertDescription>El valor de la materia elegida se reemplazará si ya existe.</AlertDescription></Alert>
          <Field v-if="item.issue_code === 'source_conflict' && detail.status === 'lista'" orientation="horizontal">
            <Checkbox :id="`proposal-conflict-${item.id}`" v-model="acceptedConflicts[item.id]" :disabled="!editable || saving" />
            <FieldLabel :for="`proposal-conflict-${item.id}`">Revisé la discrepancia y usaré este dato.</FieldLabel>
          </Field>
          <p v-if="item.issue_code === 'source_conflict' && acceptedConflicts[item.id] && item.issue" class="text-sm text-muted-foreground">{{ item.issue }}</p>
          <FieldError :errors="[problem(item) ?? undefined]" />
          <details v-for="(evidence, index) in item.evidence" :key="index" class="min-w-0 text-sm">
            <summary class="cursor-pointer break-words text-muted-foreground">{{ sourceName(evidence.source_id) }} · {{ evidence.locator }}</summary>
            <blockquote class="mt-2 whitespace-pre-wrap break-words border-l-2 pl-3">{{ evidence.quote }}</blockquote>
          </details>
        </Field>
      </FieldGroup>
      <Separator />
    </section>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}<FieldError :errors="errors" /></AlertDescription></Alert>
    <template v-if="detail.status === 'lista'">
      <Alert v-if="duplicateSelection" variant="destructive"><AlertDescription>Hay más de una propuesta para el mismo dato y asignatura. Selecciona únicamente la que corresponde.</AlertDescription></Alert>
      <p class="text-sm text-muted-foreground" aria-live="polite">{{ selectedItems.length }} datos seleccionados. Los datos con observaciones pendientes se conservan sin aplicar.</p>
      <Field orientation="horizontal"><Checkbox id="curricular-import-confirmed" v-model="confirmed" :disabled="!editable || saving" /><FieldLabel for="curricular-import-confirmed">Revisé los datos seleccionados, las asignaturas y sus fuentes.</FieldLabel></Field>
      <Button type="button" :disabled="!canApply" @click="apply"><Spinner v-if="saving" data-icon="inline-start" /><Check v-else data-icon="inline-start" aria-hidden="true" />Guardar datos seleccionados</Button>
    </template>
  </FieldGroup>
</template>
