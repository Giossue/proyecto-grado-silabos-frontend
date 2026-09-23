<script setup lang="ts">
import { FileUp, RefreshCw } from '@lucide/vue';
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createSource, getSource, ingestSourcePdf } from '@/api/sources';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type ProcessingStage = 'creating' | 'uploading' | 'processing' | 'failed';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ created: [sourceId: string]; failed: [] }>();
const open = defineModel<boolean>('open', { default: false });
const form = reactive({ nombre: '', description: '' });
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const processingDialogOpen = ref(false);
const processingStage = ref<ProcessingStage>('creating');
const progress = ref(0);
const failureMessage = ref<string | null>(null);
const selectedPdf = ref<File | null>(null);
const createdSourceId = ref<string | null>(null);
let pollingTimer: number | null = null;

const dialogTitle = computed(() => processingStage.value === 'failed'
  ? 'No se pudo procesar la fuente'
  : 'Preparando fuente académica');
const progressMessage = computed(() => ({
  creating: 'Creando la fuente académica…',
  uploading: 'Subiendo el PDF privado…',
  processing: 'Organizando el texto, las tablas y las imágenes…',
  failed: '',
}[processingStage.value]));

const clearPolling = (): void => {
  if (pollingTimer !== null) window.clearTimeout(pollingTimer);
  pollingTimer = null;
};
const reset = (): void => {
  clearPolling();
  Object.assign(form, { nombre: '', description: '' });
  errors.value = {};
  processing.value = false;
  processingDialogOpen.value = false;
  processingStage.value = 'creating';
  progress.value = 0;
  failureMessage.value = null;
  selectedPdf.value = null;
  createdSourceId.value = null;
};

watch(open, (value) => { if (value) reset(); });

const pdfValidationError = (message: string | null): void => {
  const nextErrors = { ...errors.value };
  if (message) nextErrors.pdf = [message];
  else delete nextErrors.pdf;
  errors.value = nextErrors;
};
const fail = (message: string): void => {
  clearPolling();
  processingStage.value = 'failed';
  failureMessage.value = message;
  processing.value = false;
};
const poll = async (): Promise<void> => {
  if (!createdSourceId.value) return;
  try {
    const response = await getSource(createdSourceId.value);
    const ingestion = response.source.ingestion;
    progress.value = Math.max(progress.value, ingestion.progress);
    if (ingestion.status === 'completada') {
      clearPolling();
      progress.value = 100;
      processing.value = false;
      emit('created', createdSourceId.value);
      return;
    }
    if (ingestion.status === 'fallida') {
      fail(ingestion.error_message || 'No se pudo estructurar este PDF.');
      return;
    }
    pollingTimer = window.setTimeout(() => { void poll(); }, 1200);
  } catch (reason) {
    fail(reason instanceof ApiError ? reason.message : 'No se pudo consultar el avance del procesamiento.');
  }
};
const uploadAndPoll = async (): Promise<void> => {
  if (!createdSourceId.value || !selectedPdf.value) return;
  processing.value = true;
  processingStage.value = 'uploading';
  failureMessage.value = null;
  progress.value = Math.max(progress.value, 5);
  try {
    await ingestSourcePdf(createdSourceId.value, selectedPdf.value);
    processingStage.value = 'processing';
    progress.value = Math.max(progress.value, 10);
    await poll();
  } catch (reason) {
    fail(reason instanceof ApiError ? reason.message : 'No se pudo enviar el PDF.');
  }
};
const submit = async (close: () => void): Promise<void> => {
  if (props.disabled || processing.value) return;
  errors.value = {};
  if (!selectedPdf.value) {
    errors.value.pdf = ['Seleccione el PDF de la fuente.'];
    return;
  }
  processing.value = true;
  processingDialogOpen.value = true;
  processingStage.value = 'creating';
  progress.value = 2;
  failureMessage.value = null;
  try {
    if (!createdSourceId.value) {
      createdSourceId.value = (await createSource({
        nombre: form.nombre,
        description: form.description || undefined,
      })).source_id;
    }
    close();
    await uploadAndPoll();
  } catch (reason) {
    if (reason instanceof ApiError && Object.keys(reason.errors).length > 0) {
      errors.value = reason.errors;
      processingDialogOpen.value = false;
      processing.value = false;
      return;
    }
    fail(reason instanceof ApiError ? reason.message : 'No se pudo crear la fuente.');
  }
};
const retry = (): void => {
  clearPolling();
  void uploadAndPoll();
};
const closeFailure = (): void => {
  clearPolling();
  processingDialogOpen.value = false;
  processing.value = false;
  if (createdSourceId.value) emit('failed');
};

onUnmounted(clearPolling);
</script>

<template>
  <FormSheet v-model:open="open" :disabled="props.disabled" trigger-label="Nueva fuente" title="Nueva fuente académica" description="Identifique la fuente y cargue su PDF para extraer el contenido automáticamente.">
    <template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
      <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="source-name" required>Nombre</FieldLabel><Input id="source-name" v-model="form.nombre" placeholder="Ej. Reglamento de régimen académico" required :aria-invalid="Boolean(errors.nombre)" /><FieldError :errors="errors.nombre" /></Field>
      <Field :data-invalid="Boolean(errors.description)"><FieldLabel for="source-description">Descripción</FieldLabel><Textarea id="source-description" v-model="form.description" :aria-invalid="Boolean(errors.description)" /><FieldError :errors="errors.description" /></Field>
      <Field :data-invalid="Boolean(errors.pdf)"><FieldLabel for="source-pdf" required>Cargar fuente desde PDF</FieldLabel><FileDropzone v-model="selectedPdf" input-id="source-pdf" :disabled="processing" :invalid="Boolean(errors.pdf)" @validation-error="pdfValidationError" /><FieldDescription>El texto, las tablas y las imágenes se organizarán como un documento editable. Máximo 50 MB.</FieldDescription><FieldError :errors="errors.pdf" /></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="FileUp" label="Crear fuente" />
    </FieldGroup></form></template>
  </FormSheet>

  <Dialog v-model:open="processingDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription v-if="processingStage !== 'failed'">Mantenga esta ventana abierta. Entrará al documento automáticamente cuando esté listo.</DialogDescription>
        <DialogDescription v-else>{{ createdSourceId ? 'La fuente no se abrirá hasta que el PDF termine de procesarse.' : 'Vuelva al formulario para intentarlo nuevamente.' }}</DialogDescription>
      </DialogHeader>
      <Alert v-if="processingStage === 'failed'" variant="destructive"><AlertDescription>{{ failureMessage }}</AlertDescription></Alert>
      <div v-else class="flex flex-col gap-3" aria-live="polite">
        <div class="flex items-center gap-2 text-sm"><Spinner /><span>{{ progressMessage }}</span></div>
        <Progress :model-value="progress" />
        <p class="text-right text-sm text-muted-foreground">{{ progress }} %</p>
      </div>
      <DialogFooter v-if="processingStage === 'failed'">
        <Button type="button" variant="outline" @click="closeFailure">{{ createdSourceId ? 'Volver a fuentes' : 'Volver al formulario' }}</Button>
        <Button type="button" :disabled="!createdSourceId || !selectedPdf" @click="retry"><RefreshCw data-icon="inline-start" aria-hidden="true" />Reintentar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
