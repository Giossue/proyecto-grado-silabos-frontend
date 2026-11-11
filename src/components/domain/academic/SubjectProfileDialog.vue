<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getSubjectProfile, getSubjectProfilePreview, saveSubjectProfile, type SubjectProfileField, type SubjectProfilePreview } from '@/api/career-academics';
import { Eye } from '@lucide/vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Button } from '@/components/ui/button';
import SyllabusDocumentPreview from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import FormDialog from '@/components/domain/FormDialog.vue';
import FormDialogActions from '@/components/domain/FormDialogActions.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import { responseEmpty } from '@/lib/fieldResponses';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/domain/StatusBadge.vue';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ subjectId: string; subjectName: string; disabled?: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fields = ref<SubjectProfileField[]>([]);
const builds = (field: SubjectProfileField): boolean => field.quien_llena === 'docente';
const values = ref<Record<string, DocumentNode | null>>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const GENERAL = 'General';
// Los campos del docente van juntos en una pestaña aparte, para no mezclarlos con lo que escribe Coordinación.
const RESPONSES = 'Respuestas del docente';
const sectionOf = (field: SubjectProfileField): string => field.section?.trim() || GENERAL;
const tabOf = (field: SubjectProfileField): string => builds(field) ? RESPONSES : sectionOf(field);
const sections = computed(() => {
  const own = [...new Set(fields.value.filter((field) => !builds(field)).map(sectionOf))];
  return fields.value.some(builds) ? [...own, RESPONSES] : own;
});
const chosen = ref<string | null>(null);
const activeSection = computed<string>({
  get: () => (chosen.value !== null && sections.value.includes(chosen.value) ? chosen.value : sections.value[0] ?? ''),
  set: (value) => { chosen.value = value; },
});
const isEmpty = (fieldId: string): boolean => responseEmpty(fields.value.find((field) => field.id === fieldId)?.template, values.value[fieldId]);
const sectionHasEmpty = (section: string): boolean => fields.value.some((field) => !builds(field) && sectionOf(field) === section && isEmpty(field.id));
const newSection = (index: number): boolean => index === 0 || sectionOf(shownFields.value[index - 1]!) !== sectionOf(shownFields.value[index]!);
const shownFields = computed(() => fields.value.filter((field) => tabOf(field) === activeSection.value));
// Lo cargado al abrir: sin cambios no hay nada que guardar, como en los demás formularios.
const loaded = ref('');
const changed = computed(() => JSON.stringify(values.value) !== loaded.value);
// Vista previa: el sílabo de la materia con los datos de la malla y lo que va escribiendo (aunque no esté guardado).
const view = ref<'editar' | 'vista-previa'>('editar');
const preview = ref<SubjectProfilePreview | null>(null);
const previewLoading = ref(false);
const previewError = ref<string | null>(null);
const loadPreview = async (): Promise<void> => {
  previewLoading.value = true;
  previewError.value = null;
  try {
    preview.value = await getSubjectProfilePreview(props.subjectId);
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
    // Como al generar el sílabo: si está vacío, queda el contenido inicial de la plantilla.
    const document = !builds(profileField) && isEmpty(field.id) ? profileField.content : values.value[field.id];

    return { ...field, value: document, document } as typeof field;
  }),
})));
const toggleView = (): void => {
  view.value = view.value === 'vista-previa' ? 'editar' : 'vista-previa';
  if (view.value === 'vista-previa' && !preview.value && !previewLoading.value) void loadPreview();
};

const canSave = computed(() => !loading.value && !saving.value && !props.disabled && fields.value.length > 0 && changed.value);

watch(open, async (value) => {
  if (!value) return;
  view.value = 'editar';
  preview.value = null;
  previewError.value = null;
  loading.value = true;
  error.value = null;
  try {
    const profile = await getSubjectProfile(props.subjectId);
    fields.value = [...profile.fields, ...(profile.response_fields ?? [])].sort((first, second) => (first.position ?? 0) - (second.position ?? 0));
    values.value = Object.fromEntries(fields.value.map((field) => [field.id, profile.values[field.id] ?? (builds(field) ? field.template : null) ?? field.content ?? null]));
    loaded.value = JSON.stringify(values.value);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo abrir el proyecto de carrera';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

const save = async (close: () => void) => {
  if (!canSave.value) return;
  saving.value = true;
  error.value = null;
  try {
    await saveSubjectProfile(props.subjectId, values.value);
    emit('saved');
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el proyecto de carrera';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <FormDialog v-model:open="open" fit :show-trigger="false" :title="`Proyecto de carrera de ${subjectName}`" trigger-label="Proyecto de carrera" description="Contenido de la materia que se copia en sus sílabos">
    <!-- Como el sílabo del docente: un ojo que alterna entre editar y ver cómo queda -->
    <template v-if="!loading && fields.length > 0" #headerActions>
      <IconTooltip :label="view === 'vista-previa' ? 'Volver a editar' : 'Vista previa'"><Button type="button" :variant="view === 'vista-previa' ? 'secondary' : 'ghost'" size="icon-sm" aria-label="Vista previa" :aria-pressed="view === 'vista-previa'" @click="toggleView"><Eye aria-hidden="true" /></Button></IconTooltip>
    </template>
    <template #default="{ close }">
      <form class="contents" @submit.prevent="save(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <LoadingSkeleton v-if="loading" variant="form" :rows="4" sidebar />
          <Alert v-else-if="fields.length === 0"><AlertDescription>La plantilla no tiene campos de Coordinación. Pídale a Administración que los agregue</AlertDescription></Alert>
          <template v-else>
            <template v-if="view === 'vista-previa'">
              <Alert v-if="previewError" variant="destructive"><AlertDescription>{{ previewError }}</AlertDescription></Alert>
              <LoadingSkeleton v-else-if="previewLoading || !preview" variant="preview" />
              <template v-else>
                <p class="text-sm text-muted-foreground">Así recibirán el sílabo los docentes de esta materia, antes de llenarlo</p>
                <SyllabusDocumentPreview :presentation="preview.presentation" :sections="previewSections" />
              </template>
            </template>
            <div v-show="view === 'editar'" class="flex flex-col gap-6 md:min-h-96 md:flex-row md:items-start">
              <Tabs v-if="sections.length > 1" v-model="activeSection" orientation="vertical" class="w-full shrink-0 md:w-72">
                <TabsList class="h-auto w-full flex-col items-stretch justify-start gap-1" aria-label="Secciones del proyecto de carrera">
                  <TabsTrigger v-for="section in sections" :key="section" :value="section" class="h-auto flex-none justify-start whitespace-normal border-b-0 border-l-2 py-2 text-left">{{ section }}<span v-if="sectionHasEmpty(section)" class="ml-1 text-warning" aria-hidden="true">●</span><span v-if="sectionHasEmpty(section)" class="sr-only"> (con campos sin llenar)</span></TabsTrigger>
                </TabsList>
              </Tabs>
              <fieldset class="flex min-w-0 flex-1 flex-col gap-7" :disabled="disabled">
              <p v-if="activeSection === RESPONSES" class="text-sm text-muted-foreground">Estos campos los llena el docente. Si quiere que en un espacio elija de una lista o escriba un número, haga clic en él</p>
              <template v-for="(field, index) in shownFields" :key="field.id">
              <h3 v-if="activeSection === RESPONSES && newSection(index)" class="-mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">{{ sectionOf(field) }}</h3>
              <Field>
                <div class="flex flex-wrap items-center gap-2">
                  <FieldLabel :for="`ficha-${field.id}`" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || sectionOf(field) }}</FieldLabel>
                  <StatusBadge v-if="!builds(field) && isEmpty(field.id)" label="Sin llenar" tone="warning" />
                </div>
                <FieldResponseEditor
                  :template="field.template"
                  :id="`ficha-${field.id}`"
                  :label="field.label.trim() || sectionOf(field)"
                  :disabled="disabled"
                  :setup="builds(field)"
                  ask-for="a Administración"
                  :model-value="values[field.id]"
                  @update:model-value="values[field.id] = $event"
                />
              </Field>
              </template>
              </fieldset>
            </div>
          </template>
          <FormDialogActions :close="close" :processing="saving" :disabled="!canSave" label="Guardar proyecto de carrera" />
        </FieldGroup>
      </form>
    </template>
  </FormDialog>
</template>
