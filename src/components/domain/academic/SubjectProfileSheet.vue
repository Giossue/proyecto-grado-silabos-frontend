<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getSubjectProfile, saveSubjectProfile, type SubjectProfileField } from '@/api/career-academics';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { fieldTypeRegistry } from '@/components/domain/fieldTypes/registry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ subjectId: string; subjectName: string; disabled?: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const fields = ref<SubjectProfileField[]>([]);
const values = ref<Record<string, DocumentNode | null>>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
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
});

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
  <FormSheet v-model:open="open" :show-trigger="false" :title="`Ficha de ${subjectName}`" trigger-label="Ficha" description="Datos de la materia que heredarán los sílabos nuevos. Los campos salen de la plantilla del sílabo." wide>
    <template #default="{ close }">
      <form class="contents" @submit.prevent="save(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <Alert v-if="disabled"><AlertDescription>La convocatoria activa bloquea los cambios de la ficha. Puede consultarla aquí.</AlertDescription></Alert>
          <p v-if="loading" role="status">Cargando ficha…</p>
          <Alert v-else-if="fields.length === 0"><AlertDescription>La plantilla no tiene campos marcados «se llena desde la ficha». Pídale a Administración que los marque.</AlertDescription></Alert>
          <template v-else>
            <fieldset class="contents" :disabled="disabled">
              <Field v-for="field in fields" :key="field.id">
                <FieldLabel :for="`ficha-${field.id}`">{{ field.label }}</FieldLabel>
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
  </FormSheet>
</template>
