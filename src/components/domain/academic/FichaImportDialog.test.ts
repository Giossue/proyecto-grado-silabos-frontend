import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import { applyFichaImport, getFichaImport, type FichaImport } from '@/api/ficha-imports';

vi.mock('@/api/ficha-imports', () => ({ getFichaImport: vi.fn(), startFichaImport: vi.fn(), applyFichaImport: vi.fn(), discardFichaImport: vi.fn() }));

const ready: FichaImport = {
  id: 'imp-1', state: 'lista', error: null, documents: [{ name: 'proyecto.pdf', size: 10 }], progress: { done: 2, total: 2 },
  fields: [{ key: 'descripcion', label: 'Descripción' }],
  subjects: [
    { subject_id: 's1', code: 'SW-1', name: 'Algoritmos', cycle: 1, state: 'lista', values: { descripcion: 'Texto propuesto' }, replaces: false },
    { subject_id: 's2', code: 'SW-2', name: 'Álgebra', cycle: 1, state: 'sin_evidencia', values: {}, replaces: false },
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

    expect(applyFichaImport).toHaveBeenCalledWith('imp-1', ['s1']);
    expect(wrapper.emitted('applied')).toHaveLength(1);
  });
});
