import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { applyFichaWorkbook, previewFichaWorkbook, type FichaWorkbookPreview } from '@/api/ficha-imports';

vi.mock('@/api/ficha-imports', () => ({ previewFichaWorkbook: vi.fn(), downloadFichaWorkbook: vi.fn(), applyFichaWorkbook: vi.fn() }));

const ready: FichaWorkbookPreview = {
  format: 'ficha_xlsx_v1', fingerprint: 'a'.repeat(64), file_hash: 'b'.repeat(64),
  fields: [{ key: 'descripcion', label: 'Descripción' }],
  subjects: [
    { subject_id: 's1', code: 'SW-1', name: 'Algoritmos', cycle: 1, state: 'lista', values: { descripcion: 'Texto propuesto' }, replaces: false, current: {} },
    { subject_id: 's2', code: 'SW-2', name: 'Álgebra', cycle: 1, state: 'sin_evidencia', values: {}, replaces: false, current: {} },
  ],
};

const excel = new File(['contenido'], 'proyecto.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const openDialog = async (review = true) => {
  const wrapper = mount(FichaImportDialog, { attachTo: document.body });
  await wrapper.get('button').trigger('click');
  await flushPromises();
  if (review) {
    wrapper.findComponent(FileDropzone).vm.$emit('update:modelValue', excel);
    await flushPromises();
    button('Revisar Excel')!.click();
    await flushPromises();
  }
  return wrapper;
};
const button = (text: string) => [...document.body.querySelectorAll('button')].find((item) => item.textContent?.includes(text));

describe('FichaImportDialog', () => {
  enableAutoUnmount(afterEach);

  it('ofrece la plantilla Excel aunque la IA no esté configurada', async () => {
    await openDialog(false);

    expect(button('Descargar plantilla Excel')).toBeTruthy();
    expect(button('Revisar Excel')).toBeTruthy();
    expect(document.body.textContent).not.toContain('El asistente de IA no está configurado');
  });

  it('muestra la propuesta y aplica solo las materias marcadas', async () => {
    vi.mocked(previewFichaWorkbook).mockResolvedValue({ preview: ready });
    vi.mocked(applyFichaWorkbook).mockResolvedValue({ message: 'ok', applied: 1 });
    const wrapper = await openDialog();

    expect(document.body.textContent).toContain('Vista previa del Excel para 1 de 2 materias');
    expect(document.body.textContent).toContain('1 de 1 campos con contenido');
    expect(document.body.textContent).toContain('0 de 1 campos con contenido');
    expect(button('Cerrar')).toBeUndefined();
    expect(button('Descartar')).toBeTruthy();
    button('Aplicar a 1 materias')!.click();
    await flushPromises();

    expect(applyFichaWorkbook).toHaveBeenCalledWith(excel, ready, ['s1'], undefined);
    expect(wrapper.emitted('applied')).toHaveLength(1);
  });

  it('compara con la ficha actual y aplica solo los campos marcados', async () => {
    const replacing: FichaWorkbookPreview = { ...ready, fields: [{ key: 'descripcion', label: 'Descripción' }, { key: 'bibliografia', label: 'Bibliografía' }], subjects: [
      { subject_id: 's1', code: 'SW-1', name: 'Algoritmos', cycle: 1, state: 'lista', values: { descripcion: 'Texto propuesto', bibliografia: ['Libro nuevo'] }, replaces: true, current: { descripcion: 'Texto actual' } },
    ] };
    vi.mocked(previewFichaWorkbook).mockResolvedValue({ preview: replacing });
    vi.mocked(applyFichaWorkbook).mockResolvedValue({ message: 'ok', applied: 1 });
    await openDialog();

    button('Comparar con la ficha actual')!.click();
    await flushPromises();
    expect(document.body.textContent).toContain('Texto actual');
    expect(document.body.textContent).toContain('Texto propuesto');
    (document.body.querySelector('#ficha-s1-descripcion') as HTMLElement).click();
    await flushPromises();
    button('Aplicar a 1 materias')!.click();
    await flushPromises();

    expect(applyFichaWorkbook).toHaveBeenCalledWith(excel, replacing, ['s1'], { s1: ['bibliografia'] });
  });

  it('muestra cobertura parcial, tablas y motivos de los campos pendientes', async () => {
    const proposal: FichaWorkbookPreview = { ...ready,
      fields: [{ key: 'relacion', label: 'Contribución al perfil' }, { key: 'descripcion', label: 'Descripción' }],
      subjects: [{ ...ready.subjects[0]!, values: { relacion: { columns: ['Resultado', 'Nivel'], rows: [['Resuelve sistemas', 'Alta']] } }, coverage: { found: 1, total: 2 }, missing: [{ key: 'descripcion', label: 'Descripción', reason: 'no_encontrado' }] }],
    };
    vi.mocked(previewFichaWorkbook).mockResolvedValue({ preview: proposal });
    await openDialog();

    expect(document.body.textContent).toContain('1 de 2 campos con contenido');
    expect(document.body.textContent).toContain('Revise el contenido antes de aplicar');
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
    vi.mocked(previewFichaWorkbook).mockResolvedValue({ preview: { ...ready, subjects: [{ ...ready.subjects[1]!, missing: [{ key: 'descripcion', label: 'Descripción', reason: 'no_encontrado' }] }] } });
    await openDialog();
    button('Revisar campos')!.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Sin contenido en el archivo');
    expect(button('Aplicar a 0 materias')!.disabled).toBe(true);
  });
});
