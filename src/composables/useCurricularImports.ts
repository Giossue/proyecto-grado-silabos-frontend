import { computed, onUnmounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createCurricularImport, getCurricularImport, getCurricularImports, retryCurricularImport, type CurricularImportDetail, type CurricularImportIndex } from '@/api/curricular-imports';

/** Una importación sigue en curso hasta guardarse o descartarse: se retoma al volver. */
const IN_PROGRESS = ['pendiente', 'en_ejecucion', 'lista', 'fallida'];

/**
 * Proyecto de carrera (COR-16): datos confirmados de la carrera y, como mucho, una
 * importación en curso. No hay historial: al entrar se retoma el paso donde quedó.
 */
export function useCurricularImports(careerId: () => string) {
  const index = ref<CurricularImportIndex | null>(null);
  const detail = ref<CurricularImportDetail | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const error = ref<string | null>(null);
  const errors = ref<Record<string, string[]>>({});
  const pending = computed(() => detail.value?.status === 'pendiente' || detail.value?.status === 'en_ejecucion');
  /** Paso del asistente: 1 documentos, 2 análisis, 3 revisión, 4 listo. */
  const step = computed<1 | 2 | 3 | 4>(() => {
    if (!detail.value) return 1;
    if (detail.value.status === 'lista') return 3;
    if (detail.value.status === 'aplicada') return 4;
    return 2;
  });
  const inProgress = computed(() => Boolean(detail.value && IN_PROGRESS.includes(detail.value.status)));
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
      if (request !== sequence) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      if (pending.value) timer = setTimeout(() => { void poll(id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudo consultar el procesamiento. Vuelva a abrir la importación para continuar.');
    }
  };
  /** Carga los datos de la carrera y retoma la importación en curso, si la hay. */
  const load = async (): Promise<void> => {
    stop();
    const request = ++sequence;
    loading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await getCurricularImports();
      if (request !== sequence) return;
      index.value = result;
      const active = result.imports.find((item) => IN_PROGRESS.includes(item.status));
      detail.value = null;
      if (active) await poll(active.id, request);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudieron cargar los datos del Proyecto de carrera.');
    } finally { if (request === sequence) loading.value = false; }
  };
  /** Vuelve a leer los datos confirmados sin tocar el paso del asistente. */
  const refresh = async (): Promise<void> => {
    try { index.value = await getCurricularImports(); } catch (reason) { fail(reason, 'No se pudieron actualizar los datos del Proyecto de carrera.'); }
  };
  const create = async (payload: { files: File[]; instruction: string }): Promise<void> => {
    if (uploading.value || !index.value?.capabilities.extraction || index.value.lock_reason) return;
    stop();
    const request = ++sequence;
    uploading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await createCurricularImport(payload);
      if (request !== sequence) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      if (pending.value) timer = setTimeout(() => { void poll(result.id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudieron enviar los documentos. Intente de nuevo.');
    } finally { if (request === sequence) uploading.value = false; }
  };
  const retry = async (): Promise<void> => {
    if (!detail.value || detail.value.status !== 'fallida' || uploading.value || !index.value?.capabilities.extraction || detail.value.lock_reason) return;
    stop();
    const request = ++sequence;
    uploading.value = true;
    error.value = null;
    errors.value = {};
    try {
      const result = await retryCurricularImport(detail.value.id);
      if (request !== sequence) return;
      if (!accepts(result)) throw new Error('career mismatch');
      detail.value = result;
      if (pending.value) timer = setTimeout(() => { void poll(result.id, request); }, 1800);
    } catch (reason) {
      if (request === sequence) fail(reason, 'No se pudo reintentar el análisis de estos documentos.');
    } finally { if (request === sequence) uploading.value = false; }
  };
  /** Datos guardados: el asistente muestra «Listo» y la tabla se actualiza. */
  const applied = async (result: CurricularImportDetail): Promise<void> => {
    detail.value = result;
    await refresh();
  };
  /** Tras guardar o descartar, el siguiente ingreso empieza por los documentos. */
  const startOver = (): void => { stop(); sequence += 1; detail.value = null; error.value = null; errors.value = {}; };
  onUnmounted(() => { stop(); sequence += 1; });

  return { index, detail, loading, uploading, pending, step, inProgress, error, errors, load, refresh, create, retry, applied, startOver };
}
