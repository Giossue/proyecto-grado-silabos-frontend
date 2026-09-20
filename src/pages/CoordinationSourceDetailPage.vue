<script setup lang="ts">
import { Check, FileUp } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { emptySourceDocument, getSource, ingestSourcePdf, updateSourceContent, type SourceDetail, type SourceDocument, type SourceIngestionStatus } from '@/api/sources';
import { getSession } from '@/api/session';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import AcademicSourceDocumentEditor from '@/components/domain/AcademicSourceDocumentEditor.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const route = useRoute();
const router = useRouter();
const data = ref<SourceDetail | null>(null);
const loading = ref(true);
const content = ref<SourceDocument>(emptySourceDocument());
const savedContent = ref<SourceDocument>(emptySourceDocument());
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const fieldErrors = ref<Record<string, string[]>>({});
const saving = ref(false);
const selectedPdf = ref<File | null>(null);
const uploadingPdf = ref(false);
let pollingTimer: number | null = null;
const id = (): string => String(route.params.source);
const cloneDocument = (value: SourceDocument): SourceDocument => JSON.parse(JSON.stringify(value)) as SourceDocument;
const isDirty = computed(() => JSON.stringify(content.value) !== JSON.stringify(savedContent.value));
const ingestion = computed(() => data.value?.source.ingestion);
const ingestionIsProcessing = computed(() => ingestion.value?.status === 'pendiente' || ingestion.value?.status === 'en_ejecucion');

const ingestionLabel = (status: SourceIngestionStatus): string => ({
  manual: 'Contenido manual',
  pendiente: 'PDF en cola',
  en_ejecucion: 'Procesando PDF',
  completada: 'PDF procesado',
  fallida: 'Extracción fallida',
}[status]);

const ingestionVariants: Record<SourceIngestionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  manual: 'outline',
  pendiente: 'secondary',
  en_ejecucion: 'secondary',
  completada: 'default',
  fallida: 'destructive',
};

const ingestionVariant = (status: SourceIngestionStatus) => ingestionVariants[status];

const load = async (preserveEditor = false): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = await getSource(id());
    if (!preserveEditor || !isDirty.value) {
      content.value = cloneDocument(data.value.source.document ?? emptySourceDocument());
      savedContent.value = cloneDocument(content.value);
    }
  } catch (reason) {
    loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la fuente.';
  } finally { loading.value = false; }
};
const stopPolling = (): void => {
  if (pollingTimer !== null) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }
};
const startPolling = (): void => {
  stopPolling();
  if (ingestionIsProcessing.value) {
    pollingTimer = window.setInterval(() => {
      void load(true).then(() => {
        if (!ingestionIsProcessing.value) stopPolling();
      });
    }, 2500);
  }
};
const pdfValidationError = (error: string | null): void => {
  const nextErrors = { ...fieldErrors.value };
  if (error) nextErrors.pdf = [error];
  else delete nextErrors.pdf;
  fieldErrors.value = nextErrors;
  actionError.value = null;
};
const uploadPdf = async (): Promise<void> => {
  if (!selectedPdf.value) return;
  uploadingPdf.value = true;
  actionError.value = null;
  fieldErrors.value = {};
  try {
    const response = await ingestSourcePdf(id(), selectedPdf.value);
    toast.success(response.message);
    selectedPdf.value = null;
    await load(true);
    startPolling();
  } catch (reason) {
    if (reason instanceof ApiError) {
      fieldErrors.value = reason.errors;
      actionError.value = reason.message;
    } else actionError.value = 'No se pudo enviar el PDF.';
  } finally { uploadingPdf.value = false; }
};
const saveContent = async (): Promise<void> => {
  saving.value = true;
  actionError.value = null;
  fieldErrors.value = {};
  try {
    toast.success((await updateSourceContent(id(), content.value)).message);
    savedContent.value = cloneDocument(content.value);
  } catch (reason) {
    if (reason instanceof ApiError) {
      fieldErrors.value = reason.errors;
      actionError.value = reason.message;
    } else actionError.value = 'No se pudo guardar la fuente.';
  } finally { saving.value = false; }
};
const metadataSaved = async (value: string): Promise<void> => {
  toast.success(value);
  await load();
  startPolling();
};

onMounted(async () => {
  await load();
  startPolling();
});
onUnmounted(stopPolling);
</script>

<template>
  <PageFrame title="Fuentes académicas" description="Revise y ajuste el documento estructurado. Las tablas combinadas y las imágenes conservan su posición.">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.sources">← Volver a fuentes</RouterLink></Button></template>
    <template #actions>
      <Button v-if="data" type="button" :disabled="saving || !isDirty || Boolean(data.processLock)" @click="saveContent"><Spinner v-if="saving" /><Check v-else data-icon="inline-start" aria-hidden="true" />Guardar contenido</Button>
      <AcademicSourceEditSheet v-if="data" :source="data.source" :disabled="Boolean(data.processLock)" @saved="metadataSaved" />
    </template>
    <div class="flex flex-col gap-4">
      <ProcessLockAlert v-if="data?.processLock" />
      <Alert v-if="actionError && Object.keys(fieldErrors).length === 0" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
      <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
      <LoadingSkeleton v-else-if="loading && !data" variant="source" />
      <section v-else-if="data" class="flex flex-col gap-3">
        <div class="rounded-lg border bg-card p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-medium">Cargar fuente desde PDF</h2>
              <p class="mt-1 text-sm text-muted-foreground">OpenParser organizará el texto, las tablas y las imágenes en bloques editables.</p>
            </div>
            <Badge :variant="ingestionVariant(ingestion?.status ?? 'manual')">{{ ingestionLabel(ingestion?.status ?? 'manual') }}</Badge>
          </div>
          <div class="mt-4 flex flex-col gap-3">
            <Field :data-invalid="Boolean(fieldErrors.pdf)">
              <FieldLabel for="source-pdf">PDF académico</FieldLabel>
              <FileDropzone v-model="selectedPdf" input-id="source-pdf" :disabled="uploadingPdf || ingestionIsProcessing || Boolean(data.processLock) || isDirty" :invalid="Boolean(fieldErrors.pdf)" :state="uploadingPdf ? 'uploading' : 'idle'" @validation-error="pdfValidationError" />
              <FieldDescription>Solo PDF, máximo 50 MB. El documento original se conserva privado.</FieldDescription>
              <FieldError :errors="fieldErrors.pdf" />
            </Field>
            <div class="flex flex-wrap items-center gap-2">
              <Button type="button" :disabled="!selectedPdf || uploadingPdf || ingestionIsProcessing || Boolean(data.processLock) || isDirty" @click="uploadPdf"><Spinner v-if="uploadingPdf" /><FileUp v-else data-icon="inline-start" aria-hidden="true" />{{ uploadingPdf ? 'Enviando PDF…' : 'Procesar PDF' }}</Button>
            </div>
          </div>
        </div>
        <Alert v-if="ingestion?.status === 'fallida'" variant="destructive"><AlertDescription>No se pudo extraer el contenido del PDF. El contenido anterior se conserva; puedes seleccionar el archivo y reintentarlo.</AlertDescription></Alert>
        <Alert v-else-if="ingestionIsProcessing"><AlertDescription>La extracción se está ejecutando en segundo plano. Esta pantalla se actualizará automáticamente.</AlertDescription></Alert>
        <FieldError :errors="fieldErrors.document" />
        <AcademicSourceDocumentEditor v-model="content" label="Contenido del documento" :disabled="Boolean(data.processLock)" />
        <div
          v-if="isDirty"
          class="pointer-events-none fixed bottom-4 right-6 z-20 text-right text-sm text-muted-foreground max-sm:bottom-24"
        >
          Cambios sin guardar
        </div>
      </section>
    </div>
  </PageFrame>
</template>
