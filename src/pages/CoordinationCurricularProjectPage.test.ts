import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import type { CurricularImportDetail, CurricularImportIndex } from '@/api/curricular-imports';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import CurricularImportReview from '@/components/domain/academic/curricular/CurricularImportReview.vue';
import CoordinationCurricularProjectPage from './CoordinationCurricularProjectPage.vue';

const api = vi.hoisted(() => ({ getCurricularImports: vi.fn(), getCurricularImport: vi.fn(), createCurricularImport: vi.fn(), applyCurricularImport: vi.fn(), retryCurricularImport: vi.fn(), getCurricularImportDocument: vi.fn(), discardCurricularImport: vi.fn() }));
vi.mock('@/api/curricular-imports', () => api);
vi.mock('@/state/session', () => ({ sessionState: { current: ref({ active_role: { id: 'role-1', code: 'coordinador', career_id: 'career-1', career_name: 'Software' } }) } }));

const index: CurricularImportIndex = {
  imports: [],
  subjects: [{ id: 'subject-2', name: 'Redes', code: 'SW-2' }, { id: 'subject-1', name: 'Calidad', code: 'SW-1' }],
  current_values: [],
  concepts: [
    { key: 'bibliografia_basica', label: 'Bibliografía básica', type: 'lista', sections: ['Bibliografía'] },
    { key: 'perfil_egreso', label: 'Perfil de egreso', type: 'texto', sections: ['Perfil'] },
  ],
  capabilities: { pdf: true, xlsx: true, extraction: true },
  lock_reason: null,
};
const detail: CurricularImportDetail = { id: 'import-1', career_id: 'career-1', status: 'en_ejecucion', documents: [{ source_id: 'source-1', name: 'Proyecto.pdf', kind: 'pdf', hash: 'hash', execution_id: 'execution' }], proposal: null, fingerprint: null, error: null, editable: false, lock_reason: null };
const inProgress = (status: CurricularImportDetail['status']) => ({ ...index, imports: [{ id: 'import-1', status, created_at: '2026-09-27T10:00:00Z', applied_at: null, error: null }] });
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountPage = () => {
  const wrapper = mount(CoordinationCurricularProjectPage, { attachTo: document.body, global: { stubs: {
    PageFrame: { props: ['title', 'description'], template: '<main><h1>{{ title }}</h1><p>{{ description }}</p><div data-actions><slot name="actions" /></div><slot /></main>' },
  } } });
  wrappers.push(wrapper);

  return wrapper;
};
const button = (label: string) => {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === label || item.getAttribute('aria-label') === label);
  if (!found) throw new Error(`Botón no encontrado: ${label}`);

  return found;
};
const openWizard = async (label = 'Importar documentos') => {
  button(label).click();
  await flushPromises();
};
const currentStep = () => document.querySelector('[aria-current="step"]')?.textContent ?? '';

beforeEach(() => {
  vi.resetAllMocks();
  api.getCurricularImports.mockResolvedValue(structuredClone(index));
  api.createCurricularImport.mockResolvedValue(structuredClone(detail));
  api.retryCurricularImport.mockResolvedValue(structuredClone(detail));
  api.getCurricularImport.mockResolvedValue({ ...detail, status: 'lista', fingerprint: 'f'.repeat(64), editable: true, proposal: { definitions: [], values: [], issues: [] } });
});
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CoordinationCurricularProjectPage', () => {
  it('muestra el Proyecto de carrera como una sola tabla por asignatura, sin pestañas ni historial', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, current_values: [{
      id: 'value-1', key: 'bibliografia_basica', concept_key: 'bibliografia_basica', label: 'Bibliografía básica',
      type: 'lista', columns: [], subject_id: 'subject-1', subject_name: 'Calidad',
      subject_code: 'SW-1', value: ['Pressman, Ingeniería del software.'],
      evidence: [{ source_name: 'Proyecto de carrera', locator: 'Página 22', quote: 'Pressman' }],
      confirmed_at: '2026-09-27T10:00:00Z', origin: 'importacion',
    }] });
    mountPage();
    await flushPromises();

    expect(document.querySelector('[role="tablist"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Historial');
    // Todo dato es por asignatura (I-160): una sola tabla, sin «Datos de toda la carrera».
    expect(document.querySelectorAll('table')).toHaveLength(1);
    expect(document.body.textContent).not.toContain('toda la carrera');
    const headers = Array.from(document.querySelectorAll('th')).map((cell) => cell.textContent?.trim());
    expect(headers).toEqual(['Asignatura', 'Bibliografía básica', 'Perfil de egreso']);
    const rows = Array.from(document.querySelectorAll('tbody tr')).map((row) => row.textContent ?? '');
    // Asignaturas en orden alfabético; lo que falta se dice sin etiquetas.
    expect(rows.findIndex((row) => row.includes('Calidad'))).toBeLessThan(rows.findIndex((row) => row.includes('Redes')));
    expect(rows.find((row) => row.includes('Calidad'))).toContain('Pressman, Ingeniería del software.');
    expect(rows.find((row) => row.includes('Redes'))).toContain('Sin dato');
    expect(button('Importar documentos')).toBeTruthy();
  });

  it('el asistente empieza por los documentos, envía solo archivos nuevos y sigue el análisis', async () => {
    vi.useFakeTimers();
    const wrapper = mountPage();
    await flushPromises();
    await openWizard();
    expect(currentStep()).toContain('Documentos');
    expect(document.body.textContent).toContain('Adjunta al menos un archivo para continuar.');

    const file = new File(['demo'], 'Proyecto.pdf', { type: 'application/pdf' });
    wrapper.findComponent(FileDropzone).vm.$emit('files-selected', [file]);
    await flushPromises();
    button('Analizar documentos').click();
    await flushPromises();
    expect(api.createCurricularImport).toHaveBeenCalledWith({ files: [file], instruction: '' });
    expect(currentStep()).toContain('Análisis');
    expect(document.body.textContent).toContain('al volver seguirás en este paso');

    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');
    expect(currentStep()).toContain('Revisión');
  });

  it('al volver retoma la importación en curso donde quedó', async () => {
    api.getCurricularImports.mockResolvedValue(inProgress('pendiente'));
    mountPage();
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenCalledWith('import-1');

    await openWizard('Continuar importación');
    expect(currentStep()).toContain('Revisión');
    expect(document.body.textContent).toContain('Proyecto.pdf');
  });

  it('descarga el original privado usando el nombre informado por el servidor', async () => {
    api.getCurricularImports.mockResolvedValue(inProgress('lista'));
    api.getCurricularImport.mockResolvedValue({ ...detail, status: 'lista', documents: [{ ...detail.documents[0]!, original_url: 'https://api.example.test/private/original', original_name: 'Plan original.xlsx' }] });
    api.getCurricularImportDocument.mockResolvedValue(new Blob(['archivo']));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:plan'), revokeObjectURL: vi.fn() });
    mountPage();
    await flushPromises();
    await openWizard('Continuar importación');

    button('Descargar Proyecto.pdf').click();
    await flushPromises();
    expect(api.getCurricularImportDocument).toHaveBeenCalledWith('import-1', 'source-1');
    expect(click).toHaveBeenCalled();
  });

  it('no permite enviar si la extracción está deshabilitada', async () => {
    api.getCurricularImports.mockResolvedValue({ ...index, capabilities: { pdf: false, xlsx: true, extraction: false } });
    mountPage();
    await flushPromises();
    await openWizard();

    expect(document.body.textContent).toContain('La extracción de documentos no está disponible');
    expect(button('Analizar documentos').disabled).toBe(true);
    expect(api.createCurricularImport).not.toHaveBeenCalled();
  });

  it('muestra errores de acceso y no abre el asistente', async () => {
    api.getCurricularImports.mockRejectedValue(new ApiError('No tiene permiso para esta carrera.', 403));
    mountPage();
    await flushPromises();

    expect(document.body.textContent).toContain('No tiene permiso para esta carrera.');
    expect(button('Importar documentos').disabled).toBe(true);
  });

  it('reintenta un análisis fallido con los documentos existentes', async () => {
    vi.useFakeTimers();
    api.getCurricularImports.mockResolvedValue(inProgress('fallida'));
    api.getCurricularImport.mockResolvedValueOnce({ ...detail, status: 'fallida', error: 'Servicio temporalmente indisponible.' });
    api.retryCurricularImport.mockResolvedValue({ ...detail, id: 'retry-2' });
    mountPage();
    await flushPromises();
    await openWizard('Continuar importación');
    expect(document.body.textContent).toContain('Servicio temporalmente indisponible.');

    button('Reintentar análisis').click();
    await flushPromises();
    expect(api.retryCurricularImport).toHaveBeenCalledWith('import-1');
    expect(api.createCurricularImport).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(api.getCurricularImport).toHaveBeenLastCalledWith('retry-2');
  });

  it('al guardar muestra Listo, actualiza la tabla y la siguiente vez empieza de nuevo', async () => {
    api.getCurricularImports.mockResolvedValue(inProgress('lista'));
    const wrapper = mountPage();
    await flushPromises();
    await openWizard('Continuar importación');

    api.getCurricularImports.mockResolvedValue(structuredClone(index));
    wrapper.findComponent(CurricularImportReview).vm.$emit('applied', { ...detail, status: 'aplicada' }, 'Datos guardados en el Proyecto de carrera.');
    await flushPromises();
    expect(currentStep()).toContain('Listo');
    expect(document.body.textContent).toContain('La tabla ya muestra los datos nuevos.');
    expect(api.getCurricularImports).toHaveBeenCalledTimes(2);

    button('Cerrar').click();
    await flushPromises();
    await openWizard('Importar documentos');
    expect(currentStep()).toContain('Documentos');
  });

  it('descarta la importación en curso con confirmación', async () => {
    api.getCurricularImports.mockResolvedValue(inProgress('lista'));
    api.discardCurricularImport.mockResolvedValue({ message: 'Importación descartada. Sus documentos se eliminaron.' });
    mountPage();
    await flushPromises();
    await openWizard('Continuar importación');

    button('Descartar importación').click();
    await flushPromises();
    expect(api.discardCurricularImport).not.toHaveBeenCalled();
    button('Descartar').click();
    await flushPromises();

    expect(api.discardCurricularImport).toHaveBeenCalledWith('import-1');
    expect(currentStep()).toContain('Documentos');
    expect(button('Importar documentos')).toBeTruthy();
  });
});
