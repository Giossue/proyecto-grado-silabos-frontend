<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { emptySourceDocument, getSource, getSourceOriginalPdf, updateSourceContent, type SourceDetail, type SourceDocument } from '@/api/sources';
import { getSession } from '@/api/session';
import AcademicSourceDocumentEditor from '@/components/domain/AcademicSourceDocumentEditor.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
const activeView = ref('editable');
const originalPdfObjectUrl = ref<string | null>(null);
const loadingOriginalPdf = ref(false);
const originalPdfError = ref<string | null>(null);
const id = (): string => String(route.params.source);
const cloneDocument = (value: SourceDocument): SourceDocument => JSON.parse(JSON.stringify(value)) as SourceDocument;
const isDirty = computed(() => JSON.stringify(content.value) !== JSON.stringify(savedContent.value));
const releaseOriginalPdf = (): void => {
  if (originalPdfObjectUrl.value) URL.revokeObjectURL(originalPdfObjectUrl.value);
  originalPdfObjectUrl.value = null;
};

const loadOriginalPdf = async (): Promise<void> => {
  if (originalPdfObjectUrl.value || loadingOriginalPdf.value || !data.value?.source.has_original_pdf) return;
  loadingOriginalPdf.value = true;
  originalPdfError.value = null;
  try {
    originalPdfObjectUrl.value = URL.createObjectURL(await getSourceOriginalPdf(id()));
  } catch (reason) {
    originalPdfError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el PDF original.';
  } finally {
    loadingOriginalPdf.value = false;
  }
};

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
};

onMounted(load);
watch(activeView, (view) => {
  if (view === 'original') void loadOriginalPdf();
});
onUnmounted(() => {
  releaseOriginalPdf();
});
</script>

<template>
  <PageFrame title="Fuentes académicas" description="Revise y ajuste el documento estructurado. Las tablas combinadas y las imágenes conservan su posición.">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.sources">← Volver a fuentes</RouterLink></Button></template>
    <template #actions>
      <Button v-if="data" type="button" :disabled="saving || !isDirty || Boolean(data.processLock)" @click="saveContent"><Spinner v-if="saving" /><Check v-else data-icon="inline-start" aria-hidden="true" />Guardar contenido</Button>
      <AcademicSourceEditSheet v-if="data" :source="data.source" :disabled="Boolean(data.processLock)" @saved="metadataSaved" />
    </template>
    <div class="flex min-w-0 max-w-full flex-col gap-4">
      <ProcessLockAlert v-if="data?.processLock" />
      <Alert v-if="actionError && Object.keys(fieldErrors).length === 0" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
      <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
      <LoadingSkeleton v-else-if="loading && !data" variant="source" />
      <section v-else-if="data" class="flex min-w-0 max-w-full flex-col gap-3">
        <FieldError :errors="fieldErrors.document" />
        <Tabs v-model="activeView" class="min-w-0 max-w-full">
          <TabsList v-if="data.source.has_original_pdf" aria-label="Vistas de la fuente académica">
            <TabsTrigger value="editable">Documento editable</TabsTrigger>
            <TabsTrigger value="original">PDF original</TabsTrigger>
          </TabsList>
          <TabsContent value="editable" class="min-w-0 max-w-full">
            <AcademicSourceDocumentEditor v-model="content" label="Contenido del documento" :disabled="Boolean(data.processLock)" />
          </TabsContent>
          <TabsContent v-if="data.source.has_original_pdf" value="original">
            <Alert v-if="originalPdfError" variant="destructive" class="mb-3"><AlertDescription>{{ originalPdfError }}</AlertDescription></Alert>
            <div class="overflow-hidden rounded-lg border bg-muted/30">
              <div v-if="loadingOriginalPdf" class="flex min-h-[36rem] items-center justify-center"><Spinner /><span class="sr-only">Cargando PDF original</span></div>
              <iframe
                v-else-if="originalPdfObjectUrl"
                :src="originalPdfObjectUrl"
                class="h-[75vh] min-h-[36rem] w-full bg-background"
                title="PDF original de la fuente académica"
              />
            </div>
          </TabsContent>
        </Tabs>
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
