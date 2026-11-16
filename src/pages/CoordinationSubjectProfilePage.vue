<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, Eye } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getScheduledSubjects, getSubjectProfile, getSubjectProfilePreview, saveSubjectProfile, type ScheduledSubjects, type SubjectProfileField, type SubjectProfilePreview } from '@/api/career-academics';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import StatusBadge from '@/components/domain/StatusBadge.vue';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import SyllabusDocumentPreview from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDiscardConfirmation } from '@/composables/useDiscardConfirmation';
import { goBack } from '@/lib/goBack';
import { RESPONSE_NODE, responseAttrs, responseNeedsOptions } from '@/lib/responseKinds';
import { paths } from '@/lib/routes';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';
import { curriculumEditorState } from '@/state/curriculumEditor';

const route = useRoute();
const router = useRouter();
const subjectId = computed(() => String(route.params.subject ?? ''));
const career = ref<ScheduledSubjects['career'] | null>(null);
const subjectName = ref('');
const subjects = ref<ScheduledSubjects['options']['activeSubjects']>([]);
const subjectIndex = computed(() => subjects.value.findIndex((subject) => subject.id === subjectId.value));
const previousSubject = computed(() => (subjectIndex.value > 0 ? subjects.value[subjectIndex.value - 1] : null));
const nextSubject = computed(() => (subjectIndex.value >= 0 ? subjects.value[subjectIndex.value + 1] ?? null : null));
const cycleLabel = (cycle: number): string => (cycle ? `Ciclo ${cycle}` : 'Sin ciclo');
const subjectGroups = computed(() => {
  const byCycle = new Map<number, typeof subjects.value>();
  for (const subject of subjects.value) byCycle.set(subject.ciclo, [...(byCycle.get(subject.ciclo) ?? []), subject]);
  return [...byCycle].map(([cycle, list]) => ({ cycle, list }));
});
const openSubject = (id: unknown): void => {
  if (typeof id === 'string' && id !== '' && id !== subjectId.value) void router.push(paths.coordination.careerProjectSubject(id));
};
const fields = ref<SubjectProfileField[]>([]);
const values = ref<Record<string, DocumentNode | null>>({});
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);
const loaded = ref('');
const changed = computed(() => !loading.value && JSON.stringify(values.value) !== loaded.value);
const locked = computed(() => Boolean(career.value?.lock_reason));
const GENERAL = 'General';
const sectionOf = (field: SubjectProfileField): string => field.section?.trim() || GENERAL;
const sections = computed(() => [...new Set(fields.value.map(sectionOf))]);
const chosen = ref<string | null>(null);
const activeSection = computed<string>({
  get: () => (chosen.value !== null && sections.value.includes(chosen.value) ? chosen.value : sections.value[0] ?? ''),
  set: (value) => { chosen.value = value; },
});
const shownFields = computed(() => fields.value.filter((field) => sectionOf(field) === activeSection.value));
const missingOptions = (field: SubjectProfileField): boolean => nodesOfType(values.value[field.id] ?? field.template ?? field.content, RESPONSE_NODE)
  .some((node) => responseNeedsOptions(responseAttrs(node)));
const sectionMissing = (section: string): boolean => fields.value.some((field) => sectionOf(field) === section && missingOptions(field));
const canSave = computed(() => !saving.value && !locked.value && fields.value.length > 0 && changed.value);

const view = ref<'editar' | 'vista-previa'>('editar');
const preview = ref<SubjectProfilePreview | null>(null);
const previewLoading = ref(false);
const previewError = ref<string | null>(null);
const loadPreview = async (): Promise<void> => {
  previewLoading.value = true;
  previewError.value = null;
  try {
    preview.value = await getSubjectProfilePreview(subjectId.value);
  } catch (reason) {
    previewError.value = reason instanceof ApiError ? reason.message : 'No se pudo armar la vista previa';
  } finally {
    previewLoading.value = false;
  }
};
const previewSections = computed(() => (preview.value?.sections ?? []).map((section) => ({
  ...section,
  fields: section.fields.map((field) => {
    const profileField = fields.value.find((item) => item.id === field.id);
    if (!profileField) return field;
    const document = values.value[field.id] ?? profileField.template ?? profileField.content;
    return { ...field, value: document, document } as typeof field;
  }),
})));
const toggleView = (): void => {
  view.value = view.value === 'vista-previa' ? 'editar' : 'vista-previa';
  if (view.value === 'vista-previa' && !preview.value && !previewLoading.value) void loadPreview();
};

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try {
    const [scheduled, profile] = await Promise.all([getScheduledSubjects(), getSubjectProfile(subjectId.value)]);
    career.value = scheduled.career;
    subjects.value = scheduled.options.activeSubjects
      .filter((subject) => subject.generates_syllabus !== false)
      .map((subject, order) => ({ subject, order }))
      .sort((first, second) => (first.subject.ciclo || Infinity) - (second.subject.ciclo || Infinity) || first.order - second.order)
      .map(({ subject }) => subject);
    subjectName.value = scheduled.options.activeSubjects.find((subject) => subject.id === subjectId.value)?.nombre ?? '';
    fields.value = [...profile.fields].sort((first, second) => (first.position ?? 0) - (second.position ?? 0));
    values.value = Object.fromEntries(fields.value.map((field) => [field.id, profile.values[field.id] ?? field.template ?? field.content ?? null]));
    loaded.value = JSON.stringify(values.value);
  } catch (reason) {
    loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo abrir el proyecto de carrera';
  } finally {
    loading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (!canSave.value) return;
  saving.value = true;
  error.value = null;
  try {
    const profile = await saveSubjectProfile(subjectId.value, values.value);
    values.value = Object.fromEntries(fields.value.map((field) => [field.id, profile.values[field.id] ?? field.template ?? field.content ?? null]));
    loaded.value = JSON.stringify(values.value);
    preview.value = null;
    toast.success('Proyecto de carrera guardado');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el proyecto de carrera';
  } finally {
    saving.value = false;
  }
};

const { open: discardOpen, ask: askToDiscard, decide: decideDiscard } = useDiscardConfirmation();
onBeforeRouteLeave(() => !changed.value || askToDiscard());
onBeforeRouteUpdate(() => !changed.value || askToDiscard());
watch(subjectId, () => {
  view.value = 'editar';
  preview.value = null;
  previewError.value = null;
  chosen.value = null;
  error.value = null;
  void load();
});
const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!changed.value) return;
  event.preventDefault();
  event.returnValue = '';
};
onMounted(() => {
  curriculumEditorState.setOpen(true);
  window.addEventListener('beforeunload', warnBeforeUnload);
  void load();
});
onBeforeUnmount(() => {
  curriculumEditorState.setOpen(false);
  window.removeEventListener('beforeunload', warnBeforeUnload);
});
</script>

<template>
  <PageFrame :title="subjectName ? `Proyecto de carrera de ${subjectName}` : 'Proyecto de carrera'" description="Lo que escriba le llega fijo al docente. Un campo que deje vacío lo escribe el docente" size="wide" :loading="loading && !loadError" :actions-skeleton="loading ? ['w-9', 'w-52'] : []">
    <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, paths.coordination.careerProject)"><ArrowLeft aria-hidden="true" />Volver al proyecto de carrera</Button></template>
    <template v-if="locked && career?.lock" #banner><ProcessLockAlert banner :lock="career.lock" /></template>
    <template v-if="!loading && !loadError && fields.length > 0" #actions>
      <div v-if="subjects.length > 1" class="flex items-center gap-1">
        <IconTooltip label="Materia anterior"><Button type="button" variant="ghost" size="icon" aria-label="Materia anterior" :disabled="!previousSubject" @click="previousSubject && openSubject(previousSubject.id)"><ChevronLeft aria-hidden="true" /></Button></IconTooltip>
        <Select :model-value="subjectId" @update:model-value="openSubject">
          <SelectTrigger class="w-56" aria-label="Cambiar de materia"><SelectValue placeholder="Cambiar de materia" /></SelectTrigger>
          <SelectContent>
            <SelectGroup v-for="group in subjectGroups" :key="group.cycle">
              <SelectLabel>{{ cycleLabel(group.cycle) }}</SelectLabel>
              <SelectItem v-for="subject in group.list" :key="subject.id" :value="subject.id">{{ subject.nombre }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <IconTooltip label="Materia siguiente"><Button type="button" variant="ghost" size="icon" aria-label="Materia siguiente" :disabled="!nextSubject" @click="nextSubject && openSubject(nextSubject.id)"><ChevronRight aria-hidden="true" /></Button></IconTooltip>
      </div>
      <IconTooltip :label="view === 'vista-previa' ? 'Volver a editar' : 'Vista previa'"><Button type="button" :variant="view === 'vista-previa' ? 'secondary' : 'ghost'" size="icon" aria-label="Vista previa" :aria-pressed="view === 'vista-previa'" @click="toggleView"><Eye aria-hidden="true" /></Button></IconTooltip>
      <Button type="button" :disabled="!canSave" @click="save"><Spinner v-if="saving" data-icon="inline-start" />Guardar proyecto de carrera</Button>
    </template>
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="form" :rows="4" sidebar />
    <Alert v-else-if="fields.length === 0"><AlertDescription>La plantilla no tiene campos de Carrera. Pídale a Administración que los agregue</AlertDescription></Alert>
    <div v-else class="flex flex-col gap-4">
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <template v-if="view === 'vista-previa'">
        <Alert v-if="previewError" variant="destructive"><AlertDescription>{{ previewError }}</AlertDescription></Alert>
        <LoadingSkeleton v-else-if="previewLoading || !preview" variant="preview" />
        <template v-else>
          <SyllabusDocumentPreview :presentation="preview.presentation" :sections="previewSections" />
        </template>
      </template>
      <div v-show="view === 'editar'" class="flex flex-col gap-6 md:min-h-96 md:flex-row md:items-start">
        <Tabs v-if="sections.length > 1" v-model="activeSection" orientation="vertical" class="w-full shrink-0 md:sticky md:top-4 md:w-72">
          <TabsList class="h-auto w-full flex-col items-stretch justify-start gap-1" aria-label="Secciones del proyecto de carrera">
            <TabsTrigger v-for="section in sections" :key="section" :value="section" class="h-auto flex-none justify-start whitespace-normal border-b-0 border-l-2 py-2 text-left">{{ section }}<span v-if="sectionMissing(section)" class="ml-1 text-warning" aria-hidden="true">●</span><span v-if="sectionMissing(section)" class="sr-only"> (con espacios sin opciones)</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <fieldset class="flex min-w-0 flex-1 flex-col gap-7 rounded-md bg-card p-6 text-card-foreground shadow-surface ring-1 ring-surface-ring" :disabled="locked">
          <Field v-for="field in shownFields" :key="field.id">
            <div class="flex flex-wrap items-center gap-2">
              <FieldLabel :for="`ficha-${field.id}`" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || sectionOf(field) }}</FieldLabel>
              <StatusBadge v-if="missingOptions(field)" label="Faltan opciones" tone="warning" />
            </div>
            <FieldResponseEditor
              :id="`ficha-${field.id}`"
              :template="field.template"
              :label="field.label.trim() || sectionOf(field)"
              :disabled="locked"
              career
              ask-for="a Administración"
              :model-value="values[field.id]"
              @update:model-value="values[field.id] = $event"
            />
          </Field>
        </fieldset>
      </div>
    </div>
    <UnsavedChangesDialog :open="discardOpen" title="Hay cambios sin guardar" description="Los cambios del proyecto de carrera no se guardaron. Si sale, los perderá" discard-label="Salir y descartar cambios" @continue="decideDiscard(false)" @discard="decideDiscard(true)" @update:open="(value) => { if (!value) decideDiscard(false); }" />
  </PageFrame>
</template>
