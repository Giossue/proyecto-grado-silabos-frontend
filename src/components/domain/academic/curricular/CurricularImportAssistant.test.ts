import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { CurricularImportDetail, CurricularImportIndex } from '@/api/curricular-imports';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import CurricularImportAssistant from './CurricularImportAssistant.vue';

const api = vi.hoisted(() => ({ getCurricularImports: vi.fn(), getCurricularImport: vi.fn(), createCurricularImport: vi.fn(), applyCurricularImport: vi.fn(), retryCurricularImport: vi.fn(), getCurricularImportDocument: vi.fn() }));
vi.mock('@/api/curricular-imports', () => api);
const index: CurricularImportIndex = { imports: [], subjects: [{ id: 'subject-1', name: 'Calidad', code: 'SW-1' }], sources: [{ id: 'source-1', name: 'Guía institucional' }], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null };
const detail: CurricularImportDetail = { id: 'import-1', career_id: 'career-1', status: 'en_ejecucion', documents: [{ source_id: 'source-1', name: 'Proyecto.pdf', kind: 'pdf', hash: 'hash', execution_id: 'execution' }], proposal: null, fingerprint: null, error: null, editable: false, lock_reason: null };
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountAssistant = () => { const wrapper = mount(CurricularImportAssistant, { attachTo: document.body, props: { careerId: 'career-1', careerName: 'Software' } }); wrappers.push(wrapper); return wrapper; };
const button = (label: string) => {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label);
  if (!found) throw new Error(`Botón no encontrado: ${label}`);
  return found;
};
beforeEach(() => {
  vi.resetAllMocks();
  api.getCurricularImports.mockResolvedValue(structuredClone(index));
  api.createCurricularImport.mockResolvedValue(structuredClone(detail));
  api.retryCurricularImport.mockResolvedValue(structuredClone(detail));
  api.getCurricularImport.mockResolvedValue({ ...detail, status: 'lista', fingerprint: 'f'.repeat(64), editable: true, proposal: { definitions: [], values: [], issues: [] } });
});
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CurricularImportAssistant', () => {
  it('no consulta hasta abrir y envía los archivos y documentos anteriores antes de consultar avance real', async () => {
    vi.useFakeTimers();
    const wrapper = mountAssistant();
    expect(api.getCurricularImports).not.toHaveBeenCalled();
    button('Asistente curricular').click();
    await flushPromises();
    expect(document.body.textContent).toContain('Documentos de importaciones anteriores');
    const file = new File(['demo'], 'Proyecto.pdf', { type: 'application/pdf' });
    wrapper.findComponent(FileDropzone).vm.$emit('files-selected', [file]);
    document.querySelector<HTMLButtonElement>('#curricular-source-source-1')!.click();
    await flushPromises();
    button('Analizar documentos').click();
    await flushPromises();
    expect(api.createCurricularImport).toHaveBeenCalledWith({ files: [file], source_ids: ['source-1'], instruction: '' });
    expect(document.body.textContent).toContain('Estoy leyendo los documentos');
    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');
    expect(document.body.textContent).toContain('Sin datos propuestos');
  });

  it('recupera una importación pendiente al volver a abrir el asistente', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, imports: [{ id: 'import-1', status: 'pendiente', created_at: '2026-09-27T10:00:00Z', applied_at: null, error: null }] });
    mountAssistant();
    button('Asistente curricular').click();
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');
    expect(document.body.textContent).toContain('Proyecto.pdf');
    expect(document.body.textContent).toContain('Lista para revisar');
  });

  it('descarga el original privado usando el nombre informado por el servidor', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, imports: [{ id: 'import-1', status: 'pendiente', created_at: '2026-09-27T10:00:00Z', applied_at: null, error: null }] });
    api.getCurricularImport.mockResolvedValue({ ...detail, status: 'lista', documents: [{ ...detail.documents[0]!, original_url: 'https://api.example.test/private/original', original_name: 'Plan original.xlsx' }] });
    api.getCurricularImportDocument.mockResolvedValue(new Blob(['archivo']));
    const createObjectURL = vi.fn(() => 'blob:private-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
    mountAssistant();
    button('Asistente curricular').click();
    await flushPromises();
    button('Descargar Proyecto.pdf').click();
    await flushPromises();
    expect(api.getCurricularImportDocument).toHaveBeenCalledWith('import-1', 'source-1');
    expect(filename).toBe('Plan original.xlsx');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-download');
  });

  it('muestra la capacidad real y no permite enviar si la extracción está deshabilitada', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, capabilities: { pdf: false, xlsx: true, extraction: false } });
    mountAssistant();
    button('Asistente curricular').click();
    await flushPromises();
    expect(document.body.textContent).toContain('La extracción de documentos no está disponible');
    expect(button('Analizar documentos').disabled).toBe(true);
    expect(api.createCurricularImport).not.toHaveBeenCalled();
  });

  it('muestra errores de acceso sin presentarlos como historial vacío', async () => {
    api.getCurricularImports.mockRejectedValue(new ApiError('No tiene permiso para esta carrera.', 403));
    mountAssistant();
    button('Asistente curricular').click();
    await flushPromises();
    expect(document.body.textContent).toContain('No tiene permiso para esta carrera.');
    expect(document.body.textContent).not.toContain('Aún no hay importaciones');
    expect(api.createCurricularImport).not.toHaveBeenCalled();
  });

  it('reintenta un análisis fallido con los documentos existentes y vuelve a consultar su avance', async () => {
    vi.useFakeTimers();
    api.getCurricularImports.mockResolvedValue({ ...index, imports: [{ id: 'import-1', status: 'fallida', created_at: '2026-09-27T10:00:00Z', applied_at: null, error: 'Servicio temporalmente indisponible.' }] });
    api.getCurricularImport.mockResolvedValueOnce({ ...detail, status: 'fallida', error: 'Servicio temporalmente indisponible.' });
    api.retryCurricularImport.mockResolvedValue({ ...detail, id: 'retry-2' });
    mountAssistant();
    button('Asistente curricular').click();
    await flushPromises();
    button('Historial').click();
    await flushPromises();
    button('Abrir').click();
    await flushPromises();
    expect(document.body.textContent).toContain('Servicio temporalmente indisponible.');
    button('Reintentar análisis').click();
    await flushPromises();
    expect(api.retryCurricularImport).toHaveBeenCalledWith('import-1');
    expect(api.createCurricularImport).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenLastCalledWith('retry-2');
    expect(document.body.textContent).toContain('Lista para revisar');
  });
});
