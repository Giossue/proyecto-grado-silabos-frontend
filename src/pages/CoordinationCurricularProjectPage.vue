<script setup lang="ts">
import { Download, FileSearch, RotateCw } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { discardCurricularImport, getCurricularImportDocument, type CurricularImportDetail } from '@/api/curricular-imports';
import PageFrame from '@/components/domain/PageFrame.vue';
import CurricularConfirmedData from '@/components/domain/academic/curricular/CurricularConfirmedData.vue';
import CurricularImportForm from '@/components/domain/academic/curricular/CurricularImportForm.vue';
import CurricularImportReview from '@/components/domain/academic/curricular/CurricularImportReview.vue';
import CurricularImportSteps from '@/components/domain/academic/curricular/CurricularImportSteps.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { curricularStatusLabel, useCurricularImports } from '@/composables/useCurricularImports';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

// Proyecto de carrera (COR-16): documentos de la carrera activa y los datos que usarán sus sílabos.
const careerId = computed(() => sessionState.current.value?.active_role?.career_id ?? '');
const careerName = computed(() => sessionState.current.value?.active_role?.career_name ?? 'la carrera activa');
const open = ref(true);
const downloading = ref<string | null>(null);
const { index, detail, loading, uploading, pending, error, errors, view, activeTab, load, select, create, retry, history, confirmed, applied } = useCurricularImports(open, () => careerId.value);
const navigate = (target: string | number): void => {
  if (target === 'new') void load(false);
  if (target === 'history') void history();
  if (target === 'confirmed') void confirmed();
};
// Paso a paso: 1 documentos, 2 análisis, 3 revisión, 4 listo.
const step = computed<1 | 2 | 3 | 4>(() => {
  if (view.value !== 'detail' || !detail.value) return 1;
  if (detail.value.status === 'lista') return 3;
  if (detail.value.status === 'aplicada') return 4;
  return 2;
});
const formatDate = (value: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
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
// Descartar elimina la importación y sus documentos temporales (I-152).
const discardOpen = ref(false);
const discarding = ref(false);
const discard = async (): Promise<void> => {
  if (!detail.value || discarding.value) return;
  discarding.value = true;
  try {
    const result = await discardCurricularImport(detail.value.id);
    toast.success(result.message);
    discardOpen.value = false;
    await load(false);
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo descartar la importación.');
  } finally { discarding.value = false; }
};
onMounted(async () => {
  await load();
  // Sin una importación en curso, la carrera con datos abre en lo que ya está confirmado.
  if (view.value === 'new' && index.value?.current_values.length) view.value = 'confirmed';
});
</script>

<template>
  <PageFrame title="Proyecto de carrera" :description="`Documentos de ${careerName} y los datos que usarán sus sílabos.`" size="narrow">
    <div class="flex min-w-0 flex-col gap-6">
      <Tabs :model-value="activeTab" @update:model-value="navigate">
        <TabsList class="w-full sm:w-fit">
          <TabsTrigger value="confirmed" :disabled="loading || uploading">Datos confirmados</TabsTrigger>
          <TabsTrigger value="new" :disabled="loading || uploading">Importar</TabsTrigger>
          <TabsTrigger value="history" :disabled="loading || uploading">Historial</TabsTrigger>
        </TabsList>
      </Tabs>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <CurricularImportSteps v-if="!loading && index && (view === 'new' || (view === 'detail' && detail))" :current="step" :failed="view === 'detail' && detail?.status === 'fallida'" />
      <div v-if="loading" role="status" aria-label="Cargando importaciones" class="flex flex-col gap-3"><Skeleton class="h-12 w-full" /><Skeleton class="h-40 w-full" /></div>
      <CurricularImportForm v-else-if="index && view === 'new'" :index="index" :processing="uploading" :errors="errors" @submit="create" />
      <template v-else-if="index && view === 'history'">
        <Empty v-if="!index.imports.length"><EmptyHeader><EmptyTitle>Aún no hay importaciones</EmptyTitle><EmptyDescription>Importa los documentos de la carrera para preparar sus datos.</EmptyDescription></EmptyHeader></Empty>
        <Table v-else data-cards="true">
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
          <TableBody><TableRow v-for="item in index.imports" :key="item.id"><TableCell>{{ formatDate(item.created_at) }}</TableCell><TableCell><Badge variant="secondary">{{ curricularStatusLabel(item.status) }}</Badge></TableCell><TableCell><Button type="button" variant="outline" size="sm" :aria-label="`Abrir importación del ${formatDate(item.created_at)}`" @click="select(item.id)">Abrir</Button></TableCell></TableRow></TableBody>
        </Table>
      </template>
      <CurricularConfirmedData v-else-if="index && view === 'confirmed'" :values="index.current_values" />
      <template v-else-if="index && detail && view === 'detail'">
        <div v-if="step !== 4" class="flex flex-col gap-2">
          <ul class="flex flex-col gap-2 text-sm text-muted-foreground" aria-label="Documentos de esta importación">
            <li v-for="document in detail.documents" :key="document.source_id" class="flex flex-wrap items-center justify-between gap-2">
              <span class="min-w-0 break-words">{{ document.name }}</span>
              <Button v-if="document.original_url" type="button" variant="outline" size="sm" :aria-label="`Descargar ${document.name}`" :disabled="Boolean(downloading)" @click="download(document)"><Spinner v-if="downloading === document.source_id" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />Descargar documento</Button>
            </li>
          </ul>
        </div>
        <Alert v-if="pending"><Spinner /><AlertDescription aria-live="polite">{{ detail.status === 'pendiente' ? 'Los documentos están en espera para su análisis.' : 'Estoy leyendo los documentos y relacionando los datos con la carrera y sus asignaturas.' }} Puedes salir de esta pantalla y volver desde el historial.</AlertDescription></Alert>
        <Alert v-else-if="detail.status === 'fallida'" variant="destructive"><AlertDescription>{{ detail.error ?? 'No se pudieron analizar estos documentos. Revisa los archivos y vuelve a enviarlos.' }}</AlertDescription></Alert>
        <CurricularImportReview v-else-if="detail.status === 'lista'" :key="detail.id" :detail="detail" :subjects="index.subjects" @applied="(result, message) => { applied(result); toast.success(message); }" />
        <template v-else-if="detail.status === 'aplicada'">
          <Empty class="border">
            <EmptyHeader>
              <EmptyTitle>Datos guardados</EmptyTitle>
              <EmptyDescription>Los sílabos nuevos de {{ careerName }} ya usan estos datos. Los documentos se eliminaron; cada dato conserva su extracto y de dónde salió.</EmptyDescription>
            </EmptyHeader>
            <div class="flex flex-wrap justify-center gap-2">
              <Button type="button" @click="navigate('confirmed')">Ver datos confirmados</Button>
              <Button type="button" variant="outline" @click="navigate('new')">Nueva importación</Button>
            </div>
          </Empty>
          <details class="text-sm">
            <summary class="cursor-pointer text-muted-foreground">Ver el detalle de esta importación</summary>
            <div class="pt-4"><CurricularImportReview :key="detail.id" :detail="detail" :subjects="index.subjects" /></div>
          </details>
        </template>
        <Alert v-else><AlertDescription>No se pudo reconocer el estado de esta importación. Vuelve a consultarla antes de continuar.</AlertDescription></Alert>
        <template v-if="detail.status === 'fallida'">
          <Alert v-if="detail.lock_reason || !index.capabilities.extraction"><AlertDescription>{{ detail.lock_reason ?? 'El análisis se podrá reintentar cuando el servicio de extracción esté disponible.' }}</AlertDescription></Alert>
          <Button type="button" variant="outline" class="self-start" :disabled="uploading || !index.capabilities.extraction || Boolean(detail.lock_reason)" @click="retry"><Spinner v-if="uploading" data-icon="inline-start" /><RotateCw v-else data-icon="inline-start" aria-hidden="true" />Reintentar análisis</Button>
        </template>
        <Button v-if="detail.status === 'lista' || detail.status === 'fallida'" type="button" variant="ghost" class="self-start text-muted-foreground" :disabled="discarding" @click="discardOpen = true">Descartar importación</Button>
        <Dialog v-model:open="discardOpen">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Descartar esta importación?</DialogTitle>
              <DialogDescription>Se eliminarán la propuesta y sus documentos. Los datos ya confirmados de la carrera no cambian.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" :disabled="discarding" @click="discardOpen = false">Cancelar</Button>
              <Button type="button" variant="destructive" :disabled="discarding" @click="discard"><Spinner v-if="discarding" data-icon="inline-start" />Descartar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button v-if="error" type="button" variant="outline" class="self-start" @click="select(detail.id)"><RotateCw data-icon="inline-start" aria-hidden="true" />Consultar de nuevo</Button>
      </template>
      <Button v-else-if="error" type="button" class="self-start" @click="load()"><FileSearch data-icon="inline-start" aria-hidden="true" />Cargar importaciones</Button>
    </div>
  </PageFrame>
</template>
