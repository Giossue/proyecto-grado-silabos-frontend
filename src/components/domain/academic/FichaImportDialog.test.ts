import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import { applyFichaImport, getFichaImport, type FichaImport } from '@/api/ficha-imports';

vi.mock('@/api/ficha-imports', () => ({ getFichaImport: vi.fn(), startFichaImport: vi.fn(), applyFichaImport: vi.fn(), discardFichaImport: vi.fn() }));

const ready: FichaImport = {
  id: 'imp-1', state: 'lista', error: null, documents: [{ name: 'proyecto.pdf', size: 10 }], progress: { done: 2, total: 2 },
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

  it('explica que la IA no está configurada', async () => {
    vi.mocked(getFichaImport).mockResolvedValue({ available: false, import: null });
    await openDialog();

    expect(document.body.textContent).toContain('El asistente de IA no está configurado');
  });

  it('muestra la propuesta y aplica solo las materias marcadas', async () => {
    vi.mocked(getFichaImport).mockResolvedValue({ available: true, import: ready });
    vi.mocked(applyFichaImport).mockResolvedValue({ message: 'ok' });
    const wrapper = await openDialog();

    expect(document.body.textContent).toContain('Propuesta para 1 de 2 materias');
    expect(document.body.textContent).toContain('Sin información en los documentos');
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
});
