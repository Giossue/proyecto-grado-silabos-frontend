<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { PURGE_CANCELLED_MESSAGE } from '@/api/career-academics';
import { applyCurricularImport, type CurricularDefinition, type CurricularImportDetail, type CurricularImportIndex, type CurricularProposedValue } from '@/api/curricular-imports';
import CurricularValuePreview from './CurricularValuePreview.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  if (!props.subjects.some((subject) => subject.id === subjectId(item))) return 'Elige la asignatura de la malla a la que pertenece este dato.';
  if (!item.evidence.length) return 'La propuesta no incluye evidencia suficiente.';
  return null;
};
const selectedItems = computed(() => props.detail.proposal?.values.filter((item) => selected.value.includes(item.id)) ?? []);
const duplicateSelection = computed(() => {
  const identities = selectedItems.value.map((item) => `${item.concept_key}:${subjectId(item)}`);
  return new Set(identities).size !== identities.length;
});
const canApply = computed(() => editable.value && !saving.value && Boolean(props.detail.fingerprint) && confirmed.value && !duplicateSelection.value && selectedItems.value.length > 0 && selectedItems.value.every((item) => !problem(item)));
const groups = computed(() => {
  const result = new Map<string, { label: string; items: CurricularProposedValue[] }>();
  for (const item of props.detail.proposal?.values ?? []) {
    const subject = props.subjects.find((subject) => subject.id === subjectId(item));
    const label = subject ? `${subject.code} · ${subject.name}` : item.subject_name || 'Asignatura por identificar';
    const key = subjectId(item) ?? `unmatched:${item.subject_name ?? item.id}`;
    if (!result.has(key)) result.set(key, { label, items: [] });
    result.get(key)!.items.push(item);
  }
  return [...result.entries()];
});
const sourceName = (id: string): string => props.detail.documents.find((document) => document.source_id === id)?.name ?? 'Documento fuente';
const needsSubject = (item: CurricularProposedValue): boolean => !item.subject_id
  && (item.issue_code === 'subject_unmatched' || item.issue_code === 'source_conflict');
// Un mismo nombre del documento se relaciona una sola vez con su materia de la malla.
const unmatchedNames = computed(() => [...new Set((props.detail.proposal?.values ?? []).filter(needsSubject).map((item) => item.subject_name ?? ''))]);
const nameAssignment = (name: string): string | undefined => {
  const item = props.detail.proposal?.values.find((value) => needsSubject(value) && (value.subject_name ?? '') === name);
  return item ? assignments.value[item.id] : undefined;
};
const assignName = async (name: string, subject: unknown) => {
  if (typeof subject !== 'string') return;
  const items = props.detail.proposal?.values.filter((item) => needsSubject(item) && (item.subject_name ?? '') === name) ?? [];
  for (const item of items) assignments.value[item.id] = subject;
  await nextTick();
  selected.value = [...new Set([...selected.value, ...items.filter((item) => !problem(item)).map((item) => item.id)])];
};
const onlyPending = ref(false);
// Paso a paso: primero se relacionan las materias nombradas de otra forma y después se eligen los datos.
const phase = ref<'subjects' | 'data'>('data');
const attention = (item: CurricularProposedValue): boolean => Boolean(problem(item)) || item.issue_code === 'source_conflict';
const pendingCount = computed(() => props.detail.proposal?.values.filter(attention).length ?? 0);
const visibleGroups = computed(() => groups.value
  .map(([key, group]) => [key, { ...group, items: onlyPending.value && pendingCount.value ? group.items.filter(attention) : group.items, pending: group.items.filter(attention).length }] as const)
  .filter(([, group]) => group.items.length > 0));
const choose = (id: string, value: boolean | 'indeterminate') => {
  selected.value = value === true ? [...selected.value.filter((item) => item !== id), id] : selected.value.filter((item) => item !== id);
};
watch(() => [props.detail.id, props.detail.fingerprint], () => {
  assignments.value = Object.fromEntries((props.detail.applied_items ?? []).filter((item) => item.subject_id).map((item) => [item.id, item.subject_id!]));
  acceptedConflicts.value = Object.fromEntries((props.detail.applied_items ?? []).map((item) => [item.id, item.accept_conflict]));
  selected.value = props.detail.proposal?.values.filter((item) => !problem(item)).map((item) => item.id) ?? [];
  onlyPending.value = false;
  phase.value = props.detail.status === 'lista' && unmatchedNames.value.length ? 'subjects' : 'data';
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
    <template v-if="phase === 'subjects'">
      <FieldSet :disabled="!editable || saving">
        <FieldLegend>¿A qué materia corresponde cada nombre?</FieldLegend>
        <FieldDescription>El documento nombra {{ unmatchedNames.length === 1 ? 'esta materia' : `estas ${unmatchedNames.length} materias` }} de otra forma. Elige una vez la materia de la malla y se aplicará a todos sus datos.</FieldDescription>
        <FieldGroup class="gap-3">
          <Field v-for="(name, index) in unmatchedNames" :key="name" class="sm:grid sm:grid-cols-2 sm:items-center sm:gap-3">
            <FieldLabel :for="`proposal-name-${index}`" class="break-words">{{ name || 'Materia sin nombre' }}</FieldLabel>
            <Select :model-value="nameAssignment(name)" :disabled="!editable || saving" @update:model-value="assignName(name, $event)"><SelectTrigger :id="`proposal-name-${index}`" class="w-full"><SelectValue placeholder="Selecciona la asignatura" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.code }} · {{ subject.name }}</SelectItem></SelectGroup></SelectContent></Select>
          </Field>
        </FieldGroup>
      </FieldSet>
      <div class="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">Las que no elijas quedarán sin guardar.</p>
        <Button type="button" @click="phase = 'data'">Continuar</Button>
      </div>
    </template>
    <template v-else>
    <Alert v-if="detail.proposal?.issues.length"><AlertDescription><ul class="flex list-disc flex-col gap-1 pl-4"><li v-for="(issue, index) in detail.proposal.issues" :key="index">{{ issue }}</li></ul></AlertDescription></Alert>
    <template v-if="detail.status === 'lista' && detail.proposal?.values.length">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-muted-foreground" aria-live="polite">{{ detail.proposal.values.length }} datos encontrados · {{ detail.proposal.values.length - pendingCount }} listos · {{ pendingCount }} requieren revisión</p>
        <Button v-if="unmatchedNames.length" type="button" variant="link" size="sm" class="px-0" @click="phase = 'subjects'">Volver a las materias</Button>
      </div>
      <Field v-if="pendingCount" orientation="horizontal"><Checkbox id="curricular-only-pending" v-model="onlyPending" /><FieldLabel for="curricular-only-pending">Mostrar solo los datos que requieren revisión</FieldLabel></Field>
    </template>
    <Empty v-if="!groups.length"><EmptyHeader><EmptyTitle>Sin datos propuestos</EmptyTitle><EmptyDescription>Los documentos no produjeron datos que puedan asociarse a la carrera o sus asignaturas.</EmptyDescription></EmptyHeader></Empty>
    <details v-for="[key, group] in visibleGroups" :key="key" class="group/subject min-w-0 rounded-md border" :open="group.pending > 0 || visibleGroups.length <= 3">
      <summary class="flex cursor-pointer flex-wrap items-center gap-2 p-3">
        <h3 class="min-w-0 break-words font-medium">{{ group.label }}</h3>
        <span class="text-sm text-muted-foreground">{{ group.items.length }} {{ group.items.length === 1 ? 'dato' : 'datos' }}<template v-if="group.pending"> · {{ group.pending }} por revisar</template></span>
      </summary>
      <FieldGroup class="gap-5 border-t p-3">
        <Field v-for="item in group.items" :key="item.id" class="min-w-0" :data-invalid="Boolean(problem(item))">
          <Field orientation="horizontal">
            <Checkbox v-if="detail.status === 'lista'" :id="`proposal-${item.id}`" :model-value="selected.includes(item.id)" :disabled="!editable || saving || Boolean(problem(item))" @update:model-value="choose(item.id, $event)" />
            <FieldLabel v-if="detail.status === 'lista'" :for="`proposal-${item.id}`">{{ definition(item)?.label ?? 'Dato por identificar' }}</FieldLabel>
            <template v-else><h4 class="text-sm font-medium">{{ definition(item)?.label ?? 'Dato por identificar' }}</h4><span class="text-sm text-muted-foreground">· {{ detail.applied_items?.some((applied) => applied.id === item.id) ? 'Guardado' : 'Sin aplicar' }}</span></template>
          </Field>
          <template v-if="detail.status === 'lista'">
            <p v-if="item.change" class="text-sm text-muted-foreground">{{ { new: 'Dato nuevo', unchanged: 'Sin cambio de contenido', replace: 'Reemplaza el dato vigente' }[item.change] }}</p>
            <div v-if="item.change === 'replace' && item.current_value !== null && item.current_value !== undefined" class="flex flex-col gap-2 border-l-2 pl-3">
              <p class="text-sm font-medium">Dato vigente</p>
              <CurricularValuePreview :definition="definition(item)" :value="item.current_value" />
            </div>
            <p v-if="item.change === 'replace'" class="text-sm font-medium">Propuesta del documento</p>
            <p v-if="item.change === 'unchanged'" class="text-sm text-muted-foreground">El contenido coincide. Al aplicarlo se registrará la procedencia de esta importación.</p>
          </template>
          <CurricularValuePreview :definition="definition(item)" :value="item.value" />
          <Alert v-if="detail.status === 'lista' && !item.subject_id && assignments[item.id]"><AlertDescription>El valor de la materia elegida se reemplazará si ya existe.</AlertDescription></Alert>
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
    </details>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}<FieldError :errors="errors" /></AlertDescription></Alert>
    <div v-if="detail.status === 'lista'" class="sticky bottom-0 z-10 flex flex-col gap-3 border-t bg-background py-3">
      <Alert v-if="duplicateSelection" variant="destructive"><AlertDescription>Hay más de una propuesta para el mismo dato y asignatura. Selecciona únicamente la que corresponde.</AlertDescription></Alert>
      <p class="text-sm text-muted-foreground" aria-live="polite">{{ selectedItems.length }} datos seleccionados. Los datos con observaciones pendientes se conservan sin aplicar.</p>
      <Field orientation="horizontal"><Checkbox id="curricular-import-confirmed" v-model="confirmed" :disabled="!editable || saving" /><FieldLabel for="curricular-import-confirmed">Revisé los datos seleccionados, las asignaturas y sus fuentes.</FieldLabel></Field>
      <Button type="button" :disabled="!canApply" @click="apply"><Spinner v-if="saving" data-icon="inline-start" /><Check v-else data-icon="inline-start" aria-hidden="true" />Guardar datos seleccionados</Button>
    </div>
    </template>
  </FieldGroup>
</template>
