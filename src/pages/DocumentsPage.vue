<script setup lang="ts">
import { ArrowLeft, Download, FileArchive, FileText, ShieldCheck } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { downloadDocument, getDocuments, requestDocuments, type DocumentsPayload } from '@/api/documents';
import { getSession, type Session } from '@/api/session';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const data = ref<DocumentsPayload | null>(null);
const session = ref<Session | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const message = ref<string | null>(null);
const working = ref(false);
let timer: number | null = null;
const revisionId = (): string => String(route.params.revision);
const filter = useClientFilter(() => data.value?.artifacts ?? [], (item) => [item.estado, item.renderer_label], {
  estado: { matches: (item, value) => value === 'ready' ? item.estado === 'completado' : item.estado !== 'completado' },
});
const { items: artifactPage, meta: artifactMeta, setPage: setArtifactPage } = useClientPagination(() => filter.items.value);
const hasPending = computed(() => data.value?.artifacts.some((item) => ['pendiente', 'en_ejecucion', 'procesando'].includes(item.estado)) ?? false);
const backHref = computed(() => session.value?.active_role?.code === 'coordinador' ? paths.coordination.review(revisionId()) : paths.teacher.syllabus(data.value?.syllabus.id ?? ''));
const statusLabel = (status: string): string => ({ pendiente: 'En cola', en_ejecucion: 'Generando', procesando: 'Generando', completado: 'Disponible', fallido: 'Fallida' }[status] ?? 'Estado no disponible');
const formatDate = (value: string | null): string => value === null ? '—' : new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatBytes = (value: number | null): string => value === null ? '—' : value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try { session.value = await getSession(); data.value = await getDocuments(revisionId()); }
  catch (reason) { if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; } loadError.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los documentos.'; }
  finally { loading.value = false; }
};
const requestExport = async (): Promise<void> => {
  try { working.value = true; actionError.value = null; message.value = (await requestDocuments(revisionId())).message; await load(); }
  catch (reason) { actionError.value = reason instanceof ApiError ? reason.message : 'No se pudo solicitar la exportación.'; }
  finally { working.value = false; }
};
const download = async (artifactId: string, format: 'docx' | 'pdf'): Promise<void> => {
  try { working.value = true; actionError.value = null; const blob = await downloadDocument(artifactId, format); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `silabo-${data.value?.syllabus.code ?? 'asignatura'}-revision-${data.value?.revision.number}.${format}`; anchor.click(); URL.revokeObjectURL(url); }
  catch (reason) { actionError.value = reason instanceof ApiError ? reason.message : 'No se pudo descargar el archivo.'; }
  finally { working.value = false; }
};
onMounted(() => { void load(); timer = window.setInterval(() => { if (hasPending.value) void load(); }, 4000); });
onBeforeUnmount(() => { if (timer !== null) clearInterval(timer); });
</script>

<template>
  <PageFrame title="Documentos aprobados" :description="data ? `${data.syllabus.subject} · ${data.syllabus.code} · revisión ${data.revision.number}` : 'Archivos de la revisión aprobada.'">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="backHref"><ArrowLeft aria-hidden="true" />Volver al expediente</RouterLink></Button></template>
    <template #actions><Button class="max-sm:size-14 max-sm:rounded-full max-sm:p-0" :disabled="working || !data" aria-label="Generar DOCX y PDF" @click="requestExport"><Spinner v-if="working" data-icon="inline-start" /><FileArchive v-else data-icon="inline-start" aria-hidden="true" /><span class="max-sm:hidden">Generar DOCX y PDF</span></Button></template>
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="documents" />
    <template v-else-if="data">
      <Alert><ShieldCheck aria-hidden="true" /><AlertTitle>Revisión aprobada</AlertTitle><AlertDescription>Ambos archivos se generan desde la revisión {{ data.revision.number }} aprobada por {{ data.revision.approved_by }} el {{ formatDate(data.revision.approved_at) }}. La descarga vuelve a comprobar su autorización.</AlertDescription></Alert>
      <Alert variant="destructive"><FileText aria-hidden="true" /><AlertTitle>Formato institucional en revisión</AlertTitle><AlertDescription>Esta exportación está disponible para revisión. La validación del formato institucional continúa en curso.</AlertDescription></Alert>
      <Card><CardContent class="flex flex-col gap-4"><div class="overflow-x-auto" aria-live="polite"><ClientFilterBar :filter="filter" input-id="documents-search" label="Buscar documento" placeholder="Buscar por asignatura, formato o estado"><template #filters><Field><FieldLabel for="documents-search-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="documents-search-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="ready">Listos</SelectItem><SelectItem value="pending">En proceso</SelectItem></SelectGroup></SelectContent></Select></Field></template></ClientFilterBar>
        <Table><TableHeader><TableRow><TableHead>Solicitud</TableHead><TableHead>Estado</TableHead><TableHead>Formato</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="artifactPage.length === 0" :colspan="4">{{ filter.active.value ? 'Ningún documento coincide con los filtros.' : 'Todavía no se han solicitado documentos para esta revisión.' }}</TableEmpty><TableRow v-for="artifact in artifactPage" v-else :key="artifact.id"><TableCell><p>{{ formatDate(artifact.requested_at) }}</p><p v-if="artifact.completed_at" class="text-xs text-muted-foreground">Completada {{ formatDate(artifact.completed_at) }}</p></TableCell><TableCell><span :class="artifact.estado === 'fallido' ? 'text-destructive' : ''">{{ statusLabel(artifact.estado) }}</span><p v-if="artifact.execution && ['pendiente', 'en_ejecucion', 'procesando'].includes(artifact.estado)" class="mt-1 text-xs text-muted-foreground">Progreso {{ artifact.execution.progreso }}%</p><p v-if="artifact.execution?.mensaje_error" class="mt-1 max-w-sm text-sm text-destructive">{{ artifact.execution.mensaje_error }}</p></TableCell><TableCell class="text-sm">{{ artifact.renderer_label }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para la solicitud del ${formatDate(artifact.requested_at)}`"><template v-if="artifact.files"><DropdownMenuItem as-child><button type="button" @click="download(artifact.id, 'docx')"><Download aria-hidden="true" />Descargar DOCX · {{ formatBytes(artifact.files.docx_size) }}</button></DropdownMenuItem><DropdownMenuItem as-child><button type="button" @click="download(artifact.id, 'pdf')"><Download aria-hidden="true" />Descargar PDF · {{ formatBytes(artifact.files.pdf_size) }}</button></DropdownMenuItem></template><DropdownMenuItem v-else disabled>Archivos aún no disponibles</DropdownMenuItem></TableActionsMenu></TableCell></TableRow></TableBody></Table>
      </div><TablePagination :meta="artifactMeta" mode="client" label="Paginación de solicitudes de generación" @update:page="setArtifactPage" /></CardContent></Card>
    </template>
  </PageFrame>
</template>
