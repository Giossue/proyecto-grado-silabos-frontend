import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { CurricularImportDetail, CurricularImportIndex } from '@/api/curricular-imports';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { ref } from 'vue';
import CoordinationCurricularProjectPage from './CoordinationCurricularProjectPage.vue';

const api = vi.hoisted(() => ({ getCurricularImports: vi.fn(), getCurricularImport: vi.fn(), createCurricularImport: vi.fn(), applyCurricularImport: vi.fn(), retryCurricularImport: vi.fn(), getCurricularImportDocument: vi.fn() }));
vi.mock('@/api/curricular-imports', () => api);
vi.mock('@/state/session', () => ({ sessionState: { current: ref({ active_role: { id: 'role-1', code: 'coordinador', career_id: 'career-1', career_name: 'Software' } }) } }));
const index: CurricularImportIndex = { imports: [], subjects: [{ id: 'subject-1', name: 'Calidad', code: 'SW-1' }], sources: [{ id: 'source-1', name: 'Guía institucional' }], current_values: [], concepts: [{ key: 'bibliografia_basica', label: 'Bibliografía básica', type: 'lista', scope: 'asignatura' }], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null };
const detail: CurricularImportDetail = { id: 'import-1', career_id: 'career-1', status: 'en_ejecucion', documents: [{ source_id: 'source-1', name: 'Proyecto.pdf', kind: 'pdf', hash: 'hash', execution_id: 'execution' }], proposal: null, fingerprint: null, error: null, editable: false, lock_reason: null };
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountPage = () => { const wrapper = mount(CoordinationCurricularProjectPage, { attachTo: document.body, global: { stubs: { PageFrame: { props: ['title', 'description'], template: '<main><h1>{{ title }}</h1><p>{{ description }}</p><slot /></main>' } } } }); wrappers.push(wrapper); return wrapper; };
const button = (label: string) => {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label);
  if (!found) throw new Error(`Botón no encontrado: ${label}`);
  return found;
};
const selectTab = (label: string) => {
  button(label).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
};
beforeEach(() => {
  vi.resetAllMocks();
  api.getCurricularImports.mockResolvedValue(structuredClone(index));
  api.createCurricularImport.mockResolvedValue(structuredClone(detail));
  api.retryCurricularImport.mockResolvedValue(structuredClone(detail));
  api.getCurricularImport.mockResolvedValue({ ...detail, status: 'lista', fingerprint: 'f'.repeat(64), editable: true, proposal: { definitions: [], values: [], issues: [] } });
});
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CoordinationCurricularProjectPage', () => {
  it('sin datos confirmados abre Importar, muestra la vista activa y deja la indicación adicional a elección del usuario', async () => {
    mountPage();
    await flushPromises();

    expect(button('Importar').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#curricular-import-instruction')).toBeNull();
    expect(document.body.textContent).toContain('Selecciona un archivo o un documento anterior para continuar.');
    expect(document.body.textContent).not.toContain('Organizaré los datos por asignatura');

    button('Agregar una indicación (opcional)').click();
    await flushPromises();
    expect(document.querySelector('#curricular-import-instruction')).not.toBeNull();

    selectTab('Historial');
    await flushPromises();
    expect(button('Historial').getAttribute('aria-selected')).toBe('true');
    expect(button('Importar').getAttribute('aria-selected')).toBe('false');
  });

  it('abre en los datos confirmados con su procedencia cuando la carrera ya tiene datos', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, current_values: [{
      id: 'value-1', key: 'resultados_aprendizaje', concept_key: 'resultados_aprendizaje', label: 'Resultados de aprendizaje',
      type: 'lista', scope: 'asignatura', columns: [], subject_id: 'subject-1', subject_name: 'Calidad',
      subject_code: 'SW-1', value: ['Evalúa la calidad del software.'],
      evidence: [{ source_name: 'Proyecto de carrera', locator: 'Página 22', quote: 'Evalúa la calidad del software.' }],
      confirmed_at: '2026-09-27T10:00:00Z', origin: 'importacion',
    }] });
    mountPage();
    await flushPromises();
    expect(button('Datos confirmados').getAttribute('aria-selected')).toBe('true');
    expect(document.body.textContent).toContain('SW-1 · Calidad');
    selectTab('Datos confirmados');
    await flushPromises();
    expect(document.body.textContent).toContain('SW-1 · Calidad');
    expect(document.body.textContent).toContain('Evalúa la calidad del software.');
    expect(document.body.textContent).toContain('Proyecto de carrera · Página 22');
    expect(api.getCurricularImports).toHaveBeenCalledTimes(2);
  });

  it('identifica los resultados anteriores sin fingir un extracto y permite buscar por materia', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, current_values: [{
      id: 'legacy-1', key: 'resultados_aprendizaje', concept_key: 'resultados_aprendizaje', label: 'Resultados de aprendizaje',
      type: 'lista', scope: 'asignatura', columns: [], subject_id: 'subject-1', subject_name: 'Calidad',
      subject_code: 'SW-1', value: ['Resultado anterior.'],
      evidence: [{ source_name: 'Proyecto antiguo', locator: 'Página 12', quote: null }],
      confirmed_at: '2026-09-27T10:00:00Z', origin: 'anterior',
    }] });
    mountPage();
    await flushPromises();
    selectTab('Datos confirmados');
    await flushPromises();
    expect(document.body.textContent).toContain('Registro anterior');
    expect(document.body.textContent).toContain('sin extracto digital');
    const search = new DOMWrapper(document.querySelector<HTMLInputElement>('#confirmed-curricular-search')!);
    await search.setValue('otra materia');
    expect(document.body.textContent).toContain('Sin coincidencias');
    await search.setValue('Calidad');
    expect(document.body.textContent).toContain('Resultado anterior.');
  });
  it('envía los archivos y documentos anteriores antes de consultar avance real', async () => {
    vi.useFakeTimers();
    const wrapper = mountPage();
    await flushPromises();
    expect(document.body.textContent).toContain('Reutilizar documentos');
    const file = new File(['demo'], 'Proyecto.pdf', { type: 'application/pdf' });
    wrapper.findComponent(FileDropzone).vm.$emit('files-selected', [file]);
    document.querySelector<HTMLButtonElement>('#curricular-source-source-1')!.click();
    await flushPromises();
    button('Analizar documentos').click();
    await flushPromises();
    expect(api.createCurricularImport).toHaveBeenCalledWith({ files: [file], source_ids: ['source-1'], instruction: '' });
    expect(document.body.textContent).toContain('Estoy leyendo los documentos');
    expect(button('Importar').getAttribute('aria-selected')).toBe('true');
    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');
    expect(document.body.textContent).toContain('Sin datos propuestos');
  });

  it('recupera una importación pendiente al volver a la pantalla', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, imports: [{ id: 'import-1', status: 'pendiente', created_at: '2026-09-27T10:00:00Z', applied_at: null, error: null }] });
    mountPage();
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');
    expect(document.body.textContent).toContain('Proyecto.pdf');
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Revisión');
    expect(button('Historial').getAttribute('aria-selected')).toBe('true');
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
    mountPage();
    await flushPromises();
    button('Descargar Proyecto.pdf').click();
    await flushPromises();
    expect(api.getCurricularImportDocument).toHaveBeenCalledWith('import-1', 'source-1');
    expect(filename).toBe('Plan original.xlsx');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-download');
  });

  it('muestra la capacidad real y no permite enviar si la extracción está deshabilitada', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, capabilities: { pdf: false, xlsx: true, extraction: false } });
    mountPage();
    await flushPromises();
    expect(document.body.textContent).toContain('La extracción de documentos no está disponible');
    expect(button('Analizar documentos').disabled).toBe(true);
    expect(api.createCurricularImport).not.toHaveBeenCalled();
  });

  it('muestra errores de acceso sin presentarlos como historial vacío', async () => {
    api.getCurricularImports.mockRejectedValue(new ApiError('No tiene permiso para esta carrera.', 403));
    mountPage();
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
    mountPage();
    await flushPromises();
    selectTab('Historial');
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
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Revisión');
  });

  it('guía la importación por pasos y al terminar ofrece ver los datos confirmados', async () => {
    mountPage();
    await flushPromises();
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Documentos');
    api.getCurricularImports.mockResolvedValue({ ...index, imports: [{ id: 'import-1', status: 'aplicada', created_at: '2026-09-27T10:00:00Z', applied_at: '2026-09-27T11:00:00Z', error: null }] });
    api.getCurricularImport.mockResolvedValue({ ...detail, status: 'aplicada', fingerprint: null, editable: false, proposal: { definitions: [], values: [], issues: [] }, applied_items: [] });
    selectTab('Historial');
    await flushPromises();
    button('Abrir').click();
    await flushPromises();
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Listo');
    expect(document.body.textContent).toContain('Datos guardados');
    button('Ver datos confirmados').click();
    await flushPromises();
    expect(button('Datos confirmados').getAttribute('aria-selected')).toBe('true');
  });
});
