import { computed, onUnmounted, ref, watch, type Ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCurricularImport, getCurricularImport, getCurricularImports, retryCurricularImport, type CurricularImportDetail, type CurricularImportIndex, type CurricularImportStatus } from '@/api/curricular-imports';

export const curricularStatusLabel = (status: CurricularImportStatus): string => ({
  pendiente: 'En espera', en_ejecucion: 'Procesando documentos', lista: 'Lista para revisar', aplicada: 'Datos guardados', fallida: 'No se pudo procesar',
}[status] ?? 'Estado no disponible');

export function useCurricularImports(open: Ref<boolean>, careerId: () => string) {
  const index = ref<CurricularImportIndex | null>(null);
  const detail = ref<CurricularImportDetail | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const error = ref<string | null>(null);
  const errors = ref<Record<string, string[]>>({});
  const view = ref<'new' | 'history' | 'detail' | 'confirmed'>('new');
  const detailTab = ref<'new' | 'history'>('history');
  const activeTab = computed(() => view.value === 'detail' ? detailTab.value : view.value);
  const pending = computed(() => detail.value?.status === 'pendiente' || detail.value?.status === 'en_ejecucion');
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sequence = 0;
  const stop = () => { if (timer) clearTimeout(timer); timer = null; };
  const fail = (reason: unknown, fallback: string) => {
    error.value = reason instanceof ApiError ? reason.message : fallback;
    errors.value = reason instanceof ApiError ? reason.errors : {};
  };
  const accepts = (data: CurricularImportDetail): boolean => !data.career_id || data.career_id === careerId();

  const poll = async (id: string, request: number): Promise<void> => {
    try {
      const result = await getCurricularImport(id);
      if (request !== sequence || !open.value) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      if (pending.value) timer = setTimeout(() => { void poll(id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudo consultar el procesamiento. Abra de nuevo la importación para continuar.');
    }
  };
  const select = async (id: string): Promise<void> => {
    stop();
    const request = ++sequence;
    detailTab.value = 'history';
    view.value = 'detail';
    loading.value = true;
    detail.value = null;
    error.value = null;
    errors.value = {};
    await poll(id, request);
    if (request === sequence) loading.value = false;
  };
  const load = async (resume = true): Promise<void> => {
    stop();
    const request = ++sequence;
    loading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await getCurricularImports();
      if (request !== sequence || !open.value) return;
      index.value = result;
      const active = resume ? result.imports.find((item) => ['pendiente', 'en_ejecucion', 'lista'].includes(item.status)) : undefined;
      if (active) { await select(active.id); return; }
      detail.value = null;
      view.value = 'new';
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudieron cargar las importaciones de esta carrera.');
    } finally { if (request === sequence) loading.value = false; }
  };
  const create = async (payload: { files: File[]; source_ids: string[]; instruction: string }): Promise<void> => {
    if (uploading.value || !index.value?.capabilities.extraction || index.value.lock_reason) return;
    const request = ++sequence;
    uploading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await createCurricularImport(payload);
      if (request !== sequence) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      detailTab.value = 'new';
      view.value = 'detail';
      if (pending.value && open.value) timer = setTimeout(() => { void poll(result.id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudieron enviar los documentos. Intente de nuevo.');
    } finally { if (request === sequence) uploading.value = false; }
  };
  const history = async () => { await load(false); view.value = 'history'; };
  const confirmed = async (): Promise<void> => {
    stop();
    const request = ++sequence;
    loading.value = true;
    error.value = null;
    try {
      const result = await getCurricularImports();
      if (request !== sequence || !open.value) return;
      index.value = result;
      detail.value = null;
      view.value = 'confirmed';
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudieron consultar los datos confirmados de esta carrera.');
    } finally { if (request === sequence) loading.value = false; }
  };
  const retry = async (): Promise<void> => {
    if (!detail.value || detail.value.status !== 'fallida' || uploading.value || !index.value?.capabilities.extraction || detail.value.lock_reason) return;
    const request = ++sequence;
    uploading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await retryCurricularImport(detail.value.id);
      if (request !== sequence || !open.value) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      if (pending.value) timer = setTimeout(() => { void poll(result.id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudo reintentar el análisis de estos documentos.');
    } finally { if (request === sequence) uploading.value = false; }
  };
  const newImport = () => { stop(); sequence += 1; detail.value = null; error.value = null; errors.value = {}; view.value = 'new'; };
  const applied = (result: CurricularImportDetail) => { detail.value = result; };
  watch([open, careerId], ([isOpen]) => {
    stop();
    sequence += 1;
    uploading.value = false;
    if (isOpen) void load();
  });
  onUnmounted(() => { stop(); sequence += 1; });
  return { index, detail, loading, uploading, pending, error, errors, view, activeTab, load, select, create, retry, history, confirmed, newImport, applied };
}
