<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getSubjectProfile, saveSubjectProfile, type SubjectProfileField } from '@/api/career-academics';
import FormDialog from '@/components/domain/FormDialog.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ subjectId: string; subjectName: string; disabled?: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fields = ref<SubjectProfileField[]>([]);
const values = ref<Record<string, DocumentNode | null>>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const GENERAL = 'General';
const sectionOf = (field: SubjectProfileField): string => field.section?.trim() || GENERAL;
const sections = computed(() => [...new Set(fields.value.map(sectionOf))]);
const chosen = ref<string | null>(null);
const activeSection = computed<string>({
  get: () => (chosen.value !== null && sections.value.includes(chosen.value) ? chosen.value : sections.value[0] ?? ''),
  set: (value) => { chosen.value = value; },
});
const isEmpty = (fieldId: string): boolean => {
  const value = values.value[fieldId];
  return !value || freeTextPlain(value).trim() === '';
};
const sectionHasEmpty = (section: string): boolean => fields.value.some((field) => sectionOf(field) === section && isEmpty(field.id));
const shownFields = computed(() => fields.value.filter((field) => sectionOf(field) === activeSection.value));
const canSave = computed(() => !loading.value && !saving.value && !props.disabled && fields.value.length > 0);

watch(open, async (value) => {
  if (!value) return;
  loading.value = true;
  error.value = null;
  try {
    const profile = await getSubjectProfile(props.subjectId);
    fields.value = profile.fields;
    values.value = Object.fromEntries(profile.fields.map((field) => [field.id, profile.values[field.id] ?? field.content ?? null]));
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo abrir la ficha.';
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
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar la ficha.';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <FormDialog v-model:open="open" wide :show-trigger="false" :title="`Ficha de ${subjectName}`" trigger-label="Ficha">
    <template #default="{ close }">
      <form class="contents" @submit.prevent="save(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <LoadingSkeleton v-if="loading" variant="form" :rows="4" />
          <Alert v-else-if="fields.length === 0"><AlertDescription>La plantilla no tiene campos de Coordinación. Pídale a Administración que los agregue.</AlertDescription></Alert>
          <template v-else>
            <div class="flex flex-col gap-6 md:flex-row md:items-start">
              <Tabs v-if="sections.length > 1" v-model="activeSection" orientation="vertical" class="w-full shrink-0 md:w-72">
                <TabsList class="h-auto w-full flex-col items-stretch justify-start gap-1" aria-label="Secciones de la ficha">
                  <TabsTrigger v-for="section in sections" :key="section" :value="section" class="h-auto flex-none justify-start whitespace-normal border-b-0 border-l-2 py-2 text-left">{{ section }}<span v-if="sectionHasEmpty(section)" class="ml-1 text-warning" aria-hidden="true">●</span><span v-if="sectionHasEmpty(section)" class="sr-only"> (con campos sin llenar)</span></TabsTrigger>
                </TabsList>
              </Tabs>
              <fieldset class="flex min-w-0 flex-1 flex-col gap-7" :disabled="disabled">
              <Field v-for="field in shownFields" :key="field.id">
                <div class="flex flex-wrap items-center gap-2">
                  <FieldLabel :for="`ficha-${field.id}`" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || sectionOf(field) }}</FieldLabel>
                  <StatusBadge v-if="isEmpty(field.id)" label="Sin llenar" tone="warning" />
                </div>
                <FreeTextEditor
                  :id="`ficha-${field.id}`"
                  :label="field.label.trim() || sectionOf(field)"
                  :disabled="disabled"
                  :model-value="values[field.id]"
                  @update:model-value="values[field.id] = $event"
                />
              </Field>
              </fieldset>
            </div>
          </template>
          <FormSheetActions :close="close" :processing="saving" :disabled="!canSave" label="Guardar ficha" />
        </FieldGroup>
      </form>
    </template>
  </FormDialog>
</template>
