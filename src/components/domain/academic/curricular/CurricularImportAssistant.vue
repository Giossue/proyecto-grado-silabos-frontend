<script setup lang="ts">
import { Bot, FileSearch, RotateCw } from '@lucide/vue';
import { ref } from 'vue';
import CurricularImportForm from './CurricularImportForm.vue';
import CurricularImportReview from './CurricularImportReview.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { curricularStatusLabel, useCurricularImports } from '@/composables/useCurricularImports';
import { toast } from '@/lib/toast';

const props = defineProps<{ careerId: string; careerName: string }>();
const open = ref(false);
const { index, detail, loading, uploading, pending, error, errors, view, load, select, create, retry, history, applied } = useCurricularImports(open, () => props.careerId);
const formatDate = (value: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button type="button" class="fixed bottom-6 right-6 z-40 rounded-full shadow-menu max-sm:size-12 max-sm:p-0" aria-label="Asistente curricular">
        <Bot data-icon="inline-start" aria-hidden="true" /><span class="max-sm:hidden">Asistente curricular</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" class="w-full sm:max-w-3xl">
      <SheetHeader>
        <SheetTitle>Asistente curricular</SheetTitle>
        <SheetDescription>{{ careerName }} · Importa documentos y revisa los datos que alimentarán sus sílabos.</SheetDescription>
      </SheetHeader>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" :disabled="loading || uploading" @click="load(false)">Nueva importación</Button>
          <Button type="button" variant="outline" size="sm" :disabled="loading || uploading" @click="history">Historial</Button>
        </div>
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <template v-if="loading">
          <div role="status" aria-label="Cargando importaciones" class="flex flex-col gap-3"><Skeleton class="h-12 w-full" /><Skeleton class="h-40 w-full" /></div>
        </template>
        <template v-else-if="index && view === 'new'">
          <Alert><Bot aria-hidden="true" /><AlertDescription>Adjunta el proyecto de carrera, las guías o la bibliografía. Organizaré los datos por asignatura y te mostraré de dónde salen para que los revises antes de guardarlos.</AlertDescription></Alert>
          <CurricularImportForm :index="index" :processing="uploading" :errors="errors" @submit="create" />
        </template>
        <template v-else-if="index && view === 'history'">
          <Empty v-if="!index.imports.length"><EmptyHeader><EmptyTitle>Aún no hay importaciones</EmptyTitle><EmptyDescription>Adjunta documentos para preparar los datos de esta carrera.</EmptyDescription></EmptyHeader></Empty>
          <Table v-else data-cards="true">
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
            <TableBody><TableRow v-for="item in index.imports" :key="item.id"><TableCell>{{ formatDate(item.created_at) }}</TableCell><TableCell><Badge variant="secondary">{{ curricularStatusLabel(item.status) }}</Badge></TableCell><TableCell><Button type="button" variant="outline" size="sm" :aria-label="`Abrir importación del ${formatDate(item.created_at)}`" @click="select(item.id)">Abrir</Button></TableCell></TableRow></TableBody>
          </Table>
        </template>
        <template v-else-if="index && detail && view === 'detail'">
          <div class="flex flex-col gap-2">
            <Badge variant="secondary" class="self-start">{{ curricularStatusLabel(detail.status) }}</Badge>
            <ul class="flex flex-col gap-1 text-sm text-muted-foreground"><li v-for="document in detail.documents" :key="document.source_id" class="break-words">{{ document.name }}</li></ul>
          </div>
          <Alert v-if="pending"><Spinner /><AlertDescription aria-live="polite">{{ detail.status === 'pendiente' ? 'Los documentos están en espera para su análisis.' : 'Estoy leyendo los documentos y relacionando los datos con la carrera y sus asignaturas.' }} Puedes cerrar el asistente y volver desde el historial.</AlertDescription></Alert>
          <Alert v-else-if="detail.status === 'fallida'" variant="destructive"><AlertDescription>{{ detail.error ?? 'No se pudieron analizar estos documentos. Revisa los archivos y vuelve a enviarlos.' }}</AlertDescription></Alert>
          <CurricularImportReview v-else-if="detail.status === 'lista' || detail.status === 'aplicada'" :key="detail.id" :detail="detail" :subjects="index.subjects" @applied="(result, message) => { applied(result); toast.success(message); }" />
          <Alert v-else><AlertDescription>No se pudo reconocer el estado de esta importación. Vuelve a consultarla antes de continuar.</AlertDescription></Alert>
          <template v-if="detail.status === 'fallida'">
            <Alert v-if="detail.lock_reason || !index.capabilities.extraction"><AlertDescription>{{ detail.lock_reason ?? 'El análisis se podrá reintentar cuando el servicio de extracción esté disponible.' }}</AlertDescription></Alert>
            <Button type="button" variant="outline" :disabled="uploading || !index.capabilities.extraction || Boolean(detail.lock_reason)" @click="retry"><Spinner v-if="uploading" data-icon="inline-start" /><RotateCw v-else data-icon="inline-start" aria-hidden="true" />Reintentar análisis</Button>
          </template>
          <Button v-if="error" type="button" variant="outline" @click="select(detail.id)"><RotateCw data-icon="inline-start" aria-hidden="true" />Consultar de nuevo</Button>
        </template>
        <Button v-else-if="error" type="button" @click="load()"><FileSearch data-icon="inline-start" aria-hidden="true" />Cargar importaciones</Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
