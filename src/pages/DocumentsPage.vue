<script setup lang="ts">
import { ArrowLeft, Download } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { downloadDocument, getDocuments, requestDocuments, type DocumentsPayload } from '@/api/documents';
import { getSession, type Session } from '@/api/session';
import EmptyState from '@/components/domain/EmptyState.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { attemptKey } from '@/lib/attemptKey';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const data = ref<DocumentsPayload | null>(null);
const session = ref<Session | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const working = ref(false);
let timer: number | null = null;
const revisionId = (): string => String(route.params.revision);
const PENDING = ['pendiente', 'en_ejecucion', 'procesando'];

const latest = computed(() => [...(data.value?.artifacts ?? [])]
  .sort((left, right) => new Date(right.requested_at).getTime() - new Date(left.requested_at).getTime())[0] ?? null);
const ready = computed(() => latest.value?.estado === 'completado' && latest.value.files !== null);
const pending = computed(() => PENDING.includes(latest.value?.estado ?? ''));
const failed = computed(() => latest.value?.estado === 'fallido');
const backHref = computed(() => session.value?.active_role?.code === 'coordinador'
  ? paths.coordination.review(revisionId())
  : paths.teacher.syllabus(data.value?.syllabus.id ?? ''));
const fileName = computed(() => `silabo-${data.value?.syllabus.code ?? 'asignatura'}.pdf`);

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try {
    session.value = await getSession();
    data.value = await getDocuments(revisionId());
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el PDF.';
  } finally {
    loading.value = false;
  }
};

const fetchPdf = async (): Promise<string | null> => {
  if (!latest.value) return null;
  working.value = true;
  actionError.value = null;
  try {
    return URL.createObjectURL(await downloadDocument(latest.value.id));
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : 'No se pudo abrir el PDF.';
    return null;
  } finally {
    working.value = false;
  }
};

const view = async (): Promise<void> => {
  const tab = window.open('', '_blank');
  const url = await fetchPdf();
  if (!url) { tab?.close(); return; }
  if (tab) tab.location.href = url;
  else window.location.assign(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const retryKey = attemptKey();
const retry = async (): Promise<void> => {
  working.value = true;
  actionError.value = null;
  try {
    await requestDocuments(revisionId(), retryKey.use(revisionId()));
    retryKey.reset();
    await load();
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : 'No se pudo reintentar.';
  } finally {
    working.value = false;
  }
};

const download = async (): Promise<void> => {
  const url = await fetchPdf();
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.value;
  anchor.click();
  URL.revokeObjectURL(url);
};

onMounted(() => {
  void load();
  timer = window.setInterval(() => { if (pending.value) void load(); }, 4000);
});
onBeforeUnmount(() => { if (timer !== null) clearInterval(timer); });
</script>

<template>
  <PageFrame title="PDF del sílabo" :description="data ? `${data.syllabus.subject} · ${data.syllabus.period}` : ''" size="narrow" :loading="!data">
    <template #eyebrow><Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="backHref"><ArrowLeft aria-hidden="true" />Volver</RouterLink></Button></template>
    <template v-if="ready" #actions>
      <Button type="button" variant="outline" :disabled="working" @click="view">Ver PDF</Button>
      <Button type="button" :disabled="working" @click="download"><Spinner v-if="working" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />Descargar PDF</Button>
    </template>
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="documents" />
    <template v-else-if="data">
      <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
      <p v-if="ready" class="text-sm text-muted-foreground">Aprobado el {{ formatDateDisplay(data.revision.approved_at, { dateStyle: 'medium' }) }}.</p>
      <p v-else-if="pending" class="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Spinner />Generando el PDF…</p>
      <Alert v-else-if="failed" variant="destructive"><AlertTitle>No se pudo generar el PDF</AlertTitle><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ latest?.error }}</span><Button type="button" size="sm" variant="outline" :disabled="working" @click="retry">Reintentar</Button></AlertDescription></Alert>
      <EmptyState v-else title="El PDF aún no está listo." />
    </template>
  </PageFrame>
</template>
