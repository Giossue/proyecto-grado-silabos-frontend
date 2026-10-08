<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getSubjectProfile, saveSubjectProfile, type SubjectProfileField } from '@/api/career-academics';
import FormDialog from '@/components/domain/FormDialog.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { fieldTypeRegistry } from '@/components/domain/fieldTypes/registry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
const shownFields = computed(() => fields.value.filter((field) => sectionOf(field) === activeSection.value));
const canSave = computed(() => !loading.value && !saving.value && !props.disabled && fields.value.length > 0);

watch(open, async (value) => {
  if (!value) return;
  loading.value = true;
  error.value = null;
  try {
    const profile = await getSubjectProfile(props.subjectId);
    fields.value = profile.fields;
    values.value = Object.fromEntries(profile.fields.map((field) => [field.id, profile.values[field.id] ?? null]));
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
  <FormDialog v-model:open="open" fit :show-trigger="false" :show-close-button="false" :title="`Ficha de ${subjectName}`" trigger-label="Ficha" description="Datos que heredarán los sílabos nuevos.">
    <template #default="{ close }">
      <form class="contents" @submit.prevent="save(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <LoadingSkeleton v-if="loading" variant="form" :rows="4" />
          <Alert v-else-if="fields.length === 0"><AlertDescription>La plantilla no tiene campos marcados «se llena desde la ficha». Pídale a Administración que los marque.</AlertDescription></Alert>
          <template v-else>
            <Tabs v-if="sections.length > 1" v-model="activeSection" class="w-full shrink-0">
              <TabsList class="h-auto min-h-9 w-full shrink-0 flex-wrap justify-start gap-1" aria-label="Secciones de la ficha">
                <TabsTrigger v-for="section in sections" :key="section" :value="section" class="h-auto flex-none whitespace-normal py-1.5 text-left">{{ section }}</TabsTrigger>
              </TabsList>
            </Tabs>
            <fieldset class="contents" :disabled="disabled">
              <Field v-for="field in shownFields" :key="field.id">
                <FieldLabel :for="`ficha-${field.id}`" :class="{ 'sr-only': !field.label.trim() }">{{ field.label.trim() || sectionOf(field) }}</FieldLabel>
                <FieldDescription v-if="field.help">{{ field.help }}</FieldDescription>
                <component
                  :is="fieldTypeRegistry.texto.EditorComponent"
                  :id="`ficha-${field.id}`"
                  :field="{ id: field.id, key: field.key, label: field.label, type: 'texto', value: values[field.id] }"
                  :disabled="disabled"
                  :model-value="values[field.id]"
                  @update:model-value="values[field.id] = $event"
                />
              </Field>
            </fieldset>
          </template>
          <FormSheetActions :close="close" :processing="saving" :disabled="!canSave" label="Guardar ficha" />
        </FieldGroup>
      </form>
    </template>
  </FormDialog>
</template>
