<script setup lang="ts">
import { FileUp } from '@lucide/vue';
import { reactive, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createSource, ingestSourcePdf } from '@/api/sources';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ created: [sourceId: string, message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const form = reactive({ nombre: '', description: '' });
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const selectedPdf = ref<File | null>(null);
const createdSourceId = ref<string | null>(null);

watch(open, (value) => {
  if (value) {
    Object.assign(form, { nombre: '', description: '' });
    errors.value = {};
    selectedPdf.value = null;
    createdSourceId.value = null;
  }
});

const pdfValidationError = (message: string | null): void => {
  const nextErrors = { ...errors.value };
  if (message) nextErrors.pdf = [message];
  else delete nextErrors.pdf;
  errors.value = nextErrors;
};

const submit = async (close: () => void): Promise<void> => {
  if (props.disabled) return;
  processing.value = true;
  errors.value = {};
  try {
    if (!selectedPdf.value) {
      errors.value.pdf = ['Seleccione el PDF de la fuente.'];
      return;
    }
    const sourceId = createdSourceId.value ?? (await createSource({ nombre: form.nombre, description: form.description || undefined })).source_id;
    createdSourceId.value = sourceId;
    await ingestSourcePdf(sourceId, selectedPdf.value);
    close();
    emit('created', sourceId, 'Fuente creada y PDF enviado a procesamiento.');
  } catch (reason) {
    if (reason instanceof ApiError) errors.value = reason.errors;
  } finally { processing.value = false; }
};
</script>

<template>
  <FormSheet v-model:open="open" :disabled="props.disabled" trigger-label="Nueva fuente" title="Nueva fuente académica" description="Identifique la fuente y cargue su PDF para extraer el contenido automáticamente.">
    <template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
      <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="source-name" required>Nombre</FieldLabel><Input id="source-name" v-model="form.nombre" placeholder="Ej. Reglamento de régimen académico" required :aria-invalid="Boolean(errors.nombre)" /><FieldError :errors="errors.nombre" /></Field>
      <Field :data-invalid="Boolean(errors.description)"><FieldLabel for="source-description">Descripción</FieldLabel><Textarea id="source-description" v-model="form.description" :aria-invalid="Boolean(errors.description)" /><FieldError :errors="errors.description" /></Field>
      <Field :data-invalid="Boolean(errors.pdf)"><FieldLabel for="source-pdf" required>Cargar fuente desde PDF</FieldLabel><FileDropzone v-model="selectedPdf" input-id="source-pdf" :disabled="processing" :invalid="Boolean(errors.pdf)" @validation-error="pdfValidationError" /><FieldDescription>PaddleOCR organizará el texto, las tablas y las imágenes como un documento editable. Máximo 50 MB.</FieldDescription><FieldError :errors="errors.pdf" /></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="FileUp" label="Crear fuente" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
