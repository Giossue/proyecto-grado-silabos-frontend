<script setup lang="ts">
import { FileUp, X } from '@lucide/vue';
import { reactive, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createSource, ingestSourcePdf } from '@/api/sources';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
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
const pdfInput = ref<HTMLInputElement | null>(null);
const createdSourceId = ref<string | null>(null);
const maxPdfBytes = 50 * 1024 * 1024;

watch(open, (value) => {
  if (value) {
    Object.assign(form, { nombre: '', description: '' });
    errors.value = {};
    selectedPdf.value = null;
    createdSourceId.value = null;
    if (pdfInput.value) pdfInput.value.value = '';
  }
});

const selectPdf = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  selectedPdf.value = file;
  errors.value.pdf = [];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    errors.value.pdf = ['Seleccione un archivo PDF.'];
  } else if (file.size > maxPdfBytes) {
    errors.value.pdf = ['El PDF no puede superar los 50 MB.'];
  }
};

const clearPdf = (): void => {
  selectedPdf.value = null;
  if (pdfInput.value) pdfInput.value.value = '';
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
      <Field :data-invalid="Boolean(errors.pdf)"><FieldLabel for="source-pdf" required>Cargar fuente desde PDF</FieldLabel><Input id="source-pdf" ref="pdfInput" type="file" accept="application/pdf,.pdf" :disabled="processing" required :aria-invalid="Boolean(errors.pdf)" @change="selectPdf" /><FieldDescription>El PDF se procesará con Mistral OCR y su contenido se guardará como Markdown. Máximo 50 MB.</FieldDescription><FieldError :errors="errors.pdf" /><div v-if="selectedPdf" class="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span class="truncate">{{ selectedPdf.name }}</span><Button type="button" variant="ghost" size="sm" :disabled="processing" @click="clearPdf"><X data-icon="inline-start" aria-hidden="true" />Quitar</Button></div></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="FileUp" label="Crear fuente" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
