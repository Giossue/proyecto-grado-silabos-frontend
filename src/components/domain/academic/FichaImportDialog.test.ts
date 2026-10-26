import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import { applyFichaImport, discardFichaImport, getFichaImport, type FichaImport } from '@/api/ficha-imports';

vi.mock('@/api/ficha-imports', () => ({ getFichaImport: vi.fn(), startFichaImport: vi.fn(), previewFichaWorkbook: vi.fn(), downloadFichaWorkbook: vi.fn(), applyFichaImport: vi.fn(), discardFichaImport: vi.fn() }));

const ready: FichaImport = {
  id: 'imp-1', state: 'lista', error: null, documents: [{ name: 'proyecto.pdf', size: 10 }], reading: null, progress: { done: 2, total: 2 },
  fields: [{ key: 'descripcion', label: 'Descripción' }],
  subjects: [
    { subject_id: 's1', code: 'SW-1', name: 'Algoritmos', cycle: 1, state: 'lista', values: { descripcion: 'Texto propuesto' }, replaces: false, current: {} },
    { subject_id: 's2', code: 'SW-2', name: 'Álgebra', cycle: 1, state: 'sin_evidencia', values: {}, replaces: false, current: {} },
  ],
};

const openDialog = async () => {
  const wrapper = mount(FichaImportDialog, { attachTo: document.body });
  await wrapper.get('button').trigger('click');
  await flushPromises();
  return wrapper;
};
const button = (text: string) => [...document.body.querySelectorAll('button')].find((item) => item.textContent?.includes(text));

describe('FichaImportDialog', () => {
  enableAutoUnmount(afterEach);

  it('ofrece la plantilla Excel aunque la IA no esté configurada', async () => {
    vi.mocked(getFichaImport).mockResolvedValue({ available: false, import: null });
    await openDialog();

    expect(button('Descargar plantilla Excel')).toBeTruthy();
    expect(button('Revisar Excel')).toBeTruthy();
    expect(document.body.textContent).not.toContain('El asistente de IA no está configurado');
  });

  it('muestra el documento que está leyendo sin jerga ni contador y permite cancelar', async () => {
    const reading: FichaImport = { ...ready, state: 'en_ejecucion', subjects: [], progress: { done: 0, total: 0 }, reading: { index: 1, total: 3, name: 'proyecto.pdf', ocr: 'running', started_at: new Date().toISOString() } };
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: reading });
    await openDialog();

    const status = document.body.querySelector('[role="status"]');
    expect(status?.textContent?.trim()).toBe('Leyendo el documento 1 de 3: proyecto.pdf');
    const cancel = button('Cancelar la importación');
    expect(cancel?.closest('[data-slot="dialog-footer"]')).toBeTruthy();
    expect(button('Cerrar')).toBeUndefined();
    expect(document.body.textContent).not.toContain('El OCR no informa porcentaje');

    cancel!.click();
    await flushPromises();

    expect(discardFichaImport).toHaveBeenCalledWith('imp-1');
    expect(button('Revisar Excel')).toBeTruthy();
  });

  it('muestra la propuesta y aplica solo las materias marcadas', async () => {
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: ready });
    vi.mocked(applyFichaImport).mockResolvedValue({ message: 'ok' });
    const wrapper = await openDialog();

    expect(document.body.textContent).toContain('Propuesta para 1 de 2 materias');
    expect(document.body.textContent).toContain('1 de 1 campos con contenido');
    expect(document.body.textContent).toContain('0 de 1 campos con contenido');
    expect(button('Cerrar')).toBeUndefined();
    expect(button('Descartar')).toBeTruthy();
    button('Aplicar a 1 materias')!.click();
    await flushPromises();

    expect(applyFichaImport).toHaveBeenCalledWith('imp-1', ['s1'], undefined);
    expect(wrapper.emitted('applied')).toHaveLength(1);
  });

  it('compara con la ficha actual y aplica solo los campos marcados', async () => {
    const replacing: FichaImport = { ...ready, fields: [{ key: 'descripcion', label: 'Descripción' }, { key: 'bibliografia', label: 'Bibliografía' }], subjects: [
      { subject_id: 's1', code: 'SW-1', name: 'Algoritmos', cycle: 1, state: 'lista', values: { descripcion: 'Texto propuesto', bibliografia: ['Libro nuevo'] }, replaces: true, current: { descripcion: 'Texto actual' } },
    ] };
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: replacing });
    vi.mocked(applyFichaImport).mockResolvedValue({ message: 'ok' });
    await openDialog();

    button('Comparar con la ficha actual')!.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Texto actual');
    expect(document.body.textContent).toContain('Texto propuesto');
    (document.body.querySelector('#ficha-s1-descripcion') as HTMLElement).click();
    await flushPromises();
    button('Aplicar a 1 materias')!.click();
    await flushPromises();

    expect(applyFichaImport).toHaveBeenCalledWith('imp-1', ['s1'], { s1: ['bibliografia'] });
  });

  it('muestra cobertura parcial, tablas y motivos de los campos pendientes', async () => {
    const proposal: FichaImport = { ...ready,
      fields: [{ key: 'relacion', label: 'Contribución al perfil' }, { key: 'descripcion', label: 'Descripción' }],
      timing: { started_at: '2026-10-23T10:00:00Z', ready_at: '2026-10-23T10:01:12Z' },
      subjects: [{ ...ready.subjects[0]!, values: { relacion: { columns: ['Resultado', 'Nivel'], rows: [['Resuelve sistemas', 'Alta']] } }, coverage: { found: 1, total: 2 }, missing: [{ key: 'descripcion', label: 'Descripción', reason: 'no_encontrado' }] }],
    };
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: proposal });
    await openDialog();

    expect(document.body.textContent).toContain('1 de 2 campos con contenido');
    expect(document.body.textContent).toContain('Revise el contenido antes de aplicar');
    expect(document.body.textContent).toContain('Tiempo de análisis: 1 min 12 s');
    button('Revisar campos')!.click();
    await flushPromises();

    const table = document.body.querySelector('table');
    expect(table?.getAttribute('aria-label')).toBe('Contribución al perfil');
    expect(table?.textContent).toContain('Resuelve sistemas');
    expect(table?.textContent).toContain('Alta');
    expect(document.body.textContent).toContain('Campos pendientes');
    expect(document.body.textContent).toContain('Sin contenido en el archivo');
  });

  it('permite revisar por qué una materia no tiene propuesta', async () => {
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: { ...ready, subjects: [{ ...ready.subjects[1]!, missing: [{ key: 'descripcion', label: 'Descripción', reason: 'sin_contexto' }] }] } });
    await openDialog();
    button('Revisar campos')!.click();
    await flushPromises();

    expect(document.body.textContent).toContain('No se incluyó contenido para esta materia');
    expect(button('Aplicar a 0 materias')!.disabled).toBe(true);
  });
});
