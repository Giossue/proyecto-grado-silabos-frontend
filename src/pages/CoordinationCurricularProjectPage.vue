<script setup lang="ts">
import { Download, FileUp, RotateCw } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { discardCurricularImport, getCurricularImportDocument, type CurricularImportDetail } from '@/api/curricular-imports';
import PageFrame from '@/components/domain/PageFrame.vue';
import CurricularImportForm from '@/components/domain/academic/curricular/CurricularImportForm.vue';
import CurricularImportReview from '@/components/domain/academic/curricular/CurricularImportReview.vue';
import CurricularImportSteps from '@/components/domain/academic/curricular/CurricularImportSteps.vue';
import CurricularProjectTable from '@/components/domain/academic/curricular/CurricularProjectTable.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useCurricularImports } from '@/composables/useCurricularImports';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

const careerId = computed(() => sessionState.current.value?.active_role?.career_id ?? '');
const careerName = computed(() => sessionState.current.value?.active_role?.career_name ?? 'la carrera activa');
const { index, detail, loading, uploading, pending, step, inProgress, error, errors, load, create, retry, applied, startOver } = useCurricularImports(() => careerId.value);
const wizardOpen = ref(false);
const confirmingDiscard = ref(false);
const discarding = ref(false);
const downloading = ref<string | null>(null);

const updateWizard = (value: boolean): void => {
  wizardOpen.value = value;
  confirmingDiscard.value = false;
  if (!value && step.value === 4) startOver();
};
const onApplied = async (result: CurricularImportDetail, message: string): Promise<void> => {
  await applied(result);
  toast.success(message);
};
const download = async (document: CurricularImportDetail['documents'][number]): Promise<void> => {
  if (!detail.value || !document.original_url || downloading.value) return;
  downloading.value = document.source_id;
  try {
    const file = await getCurricularImportDocument(detail.value.id, document.source_id);
    const url = URL.createObjectURL(file);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.original_name || document.name;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo descargar el documento.');
  } finally { downloading.value = null; }
};
const discard = async (): Promise<void> => {
  if (!detail.value || discarding.value) return;
  discarding.value = true;
  try {
    const result = await discardCurricularImport(detail.value.id);
    toast.success(result.message);
    confirmingDiscard.value = false;
    startOver();
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo descartar la importación.');
  } finally { discarding.value = false; }
};
onMounted(load);
</script>

<template>
  <PageFrame title="Proyecto de carrera" :description="`Datos de ${careerName} que usarán sus sílabos.`">
    <template #actions>
      <Button type="button" :disabled="loading || !index" @click="updateWizard(true)">
        <FileUp data-icon="inline-start" aria-hidden="true" />
        {{ inProgress ? 'Continuar importación' : 'Importar documentos' }}
      </Button>
    </template>

    <Alert v-if="error && !wizardOpen" variant="destructive" class="mb-4"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <div v-if="loading" role="status" aria-label="Cargando el Proyecto de carrera" class="flex flex-col gap-3"><Skeleton class="h-10 w-full" /><Skeleton class="h-64 w-full" /></div>
    <CurricularProjectTable v-else-if="index" :subjects="index.subjects" :concepts="index.concepts" :values="index.current_values" />
    <Button v-else-if="error" type="button" variant="outline" @click="load"><RotateCw data-icon="inline-start" aria-hidden="true" />Volver a cargar</Button>

    <Dialog :open="wizardOpen" @update:open="updateWizard">
      <DialogContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar documentos de la carrera</DialogTitle>
          <DialogDescription>Sube el proyecto de carrera o sus guías. Revisas lo encontrado y lo guardas en la tabla.</DialogDescription>
        </DialogHeader>
        <div v-if="index" class="flex min-w-0 flex-col gap-5">
          <CurricularImportSteps :current="step" :failed="detail?.status === 'fallida'" />
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>

          <CurricularImportForm v-if="step === 1" :index="index" :processing="uploading" :errors="errors" @submit="create" />

          <template v-else-if="detail">
            <ul v-if="step !== 4" class="flex flex-col gap-2 text-sm text-muted-foreground" aria-label="Documentos de esta importación">
              <li v-for="document in detail.documents" :key="document.source_id" class="flex flex-wrap items-center justify-between gap-2">
                <span class="min-w-0 break-words">{{ document.name }}</span>
                <Button v-if="document.original_url" type="button" variant="outline" size="sm" :aria-label="`Descargar ${document.name}`" :disabled="Boolean(downloading)" @click="download(document)"><Spinner v-if="downloading === document.source_id" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />Descargar</Button>
              </li>
            </ul>
            <Alert v-if="pending"><Spinner /><AlertDescription aria-live="polite">{{ detail.status === 'pendiente' ? 'Los documentos están en espera para su análisis.' : 'Estoy leyendo los documentos y relacionando los datos con la carrera y sus asignaturas.' }} Puedes cerrar esta ventana: al volver seguirás en este paso.</AlertDescription></Alert>
            <template v-else-if="detail.status === 'fallida'">
              <Alert variant="destructive"><AlertDescription>{{ detail.error ?? 'No se pudieron analizar estos documentos. Revisa los archivos y vuelve a intentarlo.' }}</AlertDescription></Alert>
              <Alert v-if="detail.lock_reason || !index.capabilities.extraction"><AlertDescription>{{ detail.lock_reason ?? 'El análisis se podrá reintentar cuando el servicio de extracción esté disponible.' }}</AlertDescription></Alert>
              <Button type="button" variant="outline" class="self-start" :disabled="uploading || !index.capabilities.extraction || Boolean(detail.lock_reason)" @click="retry"><Spinner v-if="uploading" data-icon="inline-start" /><RotateCw v-else data-icon="inline-start" aria-hidden="true" />Reintentar análisis</Button>
            </template>
            <CurricularImportReview v-else-if="step === 3" :key="detail.id" :detail="detail" :subjects="index.subjects" @applied="onApplied" />
            <Empty v-else-if="step === 4" class="border">
              <EmptyHeader>
                <EmptyTitle>Datos guardados</EmptyTitle>
                <EmptyDescription>La tabla ya muestra los datos nuevos. Los documentos se eliminaron; cada dato conserva su extracto y de dónde salió.</EmptyDescription>
              </EmptyHeader>
              <Button type="button" @click="updateWizard(false)">Cerrar</Button>
            </Empty>

            <div v-if="detail.status === 'lista' || detail.status === 'fallida'" class="flex flex-col gap-3 border-t pt-4">
              <Button v-if="!confirmingDiscard" type="button" variant="ghost" class="self-start text-muted-foreground" @click="confirmingDiscard = true">Descartar importación</Button>
              <Alert v-else variant="destructive">
                <AlertDescription class="flex flex-col gap-3">
                  <span>Se eliminarán la propuesta y sus documentos. Los datos de la tabla no cambian.</span>
                  <span class="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" :disabled="discarding" @click="confirmingDiscard = false">Cancelar</Button>
                    <Button type="button" variant="destructive" size="sm" :disabled="discarding" @click="discard"><Spinner v-if="discarding" data-icon="inline-start" />Descartar</Button>
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          </template>
        </div>
      </DialogContent>
    </Dialog>
  </PageFrame>
</template>
