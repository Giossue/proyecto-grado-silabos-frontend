import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';
import { updateAcademicRecord } from '@/api/academic';
import { getCatalogLibraries } from '@/api/libraryCatalog';

vi.mock('@/api/academic', () => ({ updateAcademicRecord: vi.fn() }));
vi.mock('@/api/libraryCatalog', () => ({ getCatalogLibraries: vi.fn() }));

beforeEach(() => {
  vi.mocked(getCatalogLibraries).mockResolvedValue([{ id: 'BFCCA', name: 'LAGUACOTO' }, { id: 'BGEN', name: 'MATRIZ' }, { id: 'BHTM', name: 'SAN MIGUEL' }]);
  vi.mocked(updateAcademicRecord).mockResolvedValue({ message: 'Facultad actualizada.' });
});
afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

const mountSheet = (extra: Record<string, unknown> = {}) => mount(CatalogEditSheet, {
  attachTo: document.body,
  props: {
    entity: 'facultad', recordId: 'faculty-1', recordName: 'Facultad de Ciencias', campus: 'matriz',
    faculties: [], campusOptions: [{ value: 'matriz', label: 'Campus Matriz' }], modalityOptions: [],
    logoUrl: 'https://api.example.test/logos/faculty-1.png', showTrigger: false, open: true, ...extra,
  },
});
const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.getAttribute('aria-label') === label || item.textContent?.trim() === label);

describe('CatalogEditSheet · logo de la facultad', () => {
  it('con logo muestra la imagen con una X y no la zona de arrastre; al quitarlo aparece la zona', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Arrastra tu PNG aquí');

    button('Quitar logo')!.click();
    await flushPromises();
    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).toBeNull();
    expect(document.body.textContent).toContain('Arrastra tu PNG aquí');
    wrapper.unmount();
  });

  it('quitar el logo sin subir otro no deja guardar, y cancelar vuelve a mostrar el logo', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    button('Quitar logo')!.click();
    await flushPromises();

    expect(document.body.querySelector<HTMLInputElement>('#edit-faculty-logo-faculty-1')?.required).toBe(true);
    button('Guardar cambios')!.click();
    await flushPromises();
    expect(updateAcademicRecord).not.toHaveBeenCalled();

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Arrastra tu PNG aquí');
    wrapper.unmount();
  });
});

describe('CatalogEditSheet · bibliotecas de Koha de la facultad', () => {
  const sentLibraries = (): string | null => (vi.mocked(updateAcademicRecord).mock.calls[0]![2] as FormData).get('catalog_libraries') as string | null;
  const row = (name: string): HTMLElement => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="field"]')).find((item) => item.textContent?.trim() === name)!;
  const isChecked = (name: string): boolean => row(name).querySelector('[role="checkbox"]')!.getAttribute('aria-checked') === 'true';
  const tick = async (name: string): Promise<void> => { row(name).querySelector<HTMLElement>('[role="checkbox"]')!.click(); await flushPromises(); };
  const tab = async (label: string): Promise<void> => { const trigger = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).find((item) => item.textContent?.trim() === label)!; trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); trigger.click(); await flushPromises(); };
  const save = async (): Promise<void> => { button('Guardar cambios')!.click(); await flushPromises(); };

  it('tiene una pestaña Bibliotecas, aparte de los datos, que solo lista las bibliotecas disponibles con casillas', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(Array.from(document.querySelectorAll('[role="tab"]')).map((item) => item.textContent?.trim())).toEqual(['Datos', 'Bibliotecas']);
    expect(document.body.textContent).not.toContain('Bibliotecas disponibles');
    await tab('Bibliotecas');
    expect(document.body.textContent).toContain('Bibliotecas disponibles');
    expect(Array.from(document.querySelectorAll('[data-slot="field"]')).map((item) => item.textContent?.trim()).filter((text) => ['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].includes(text ?? ''))).toEqual(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL']);
    expect(document.body.textContent).not.toContain('BGEN');
    expect(document.querySelector('[role="radio"]')).toBeNull();
    wrapper.unmount();
  });

  it('tiene un ícono de ayuda junto al título de las bibliotecas, solo en la pestaña de bibliotecas', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.querySelector('[aria-label="Qué significa esto"]')).toBeNull();
    await tab('Bibliotecas');
    expect(document.querySelector('legend [aria-label="Qué significa esto"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('sin bibliotecas guardadas muestra todas marcadas, y guardar sin tocarlas no cambia nada', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([true, true, true]);
    await save();
    expect(sentLibraries()).toBeNull();
    wrapper.unmount();
  });

  it('desmarcar bibliotecas guarda los códigos de las que quedan', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    await tab('Bibliotecas');
    await tick('LAGUACOTO');
    await save();

    expect(sentLibraries()).toBe('["BGEN","BHTM"]');
    wrapper.unmount();
  });

  it('con bibliotecas guardadas abre con solo esas marcadas, y marcar todas se guarda vacío para que entren las nuevas', async () => {
    const wrapper = mountSheet({ catalogLibraries: ['BGEN'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([false, true, false]);
    await tick('LAGUACOTO');
    await tick('SAN MIGUEL');
    await save();

    expect(sentLibraries()).toBe('[]');
    wrapper.unmount();
  });

  it('si la facultad ya tenía guardadas todas, se ven todas marcadas y al guardar queda vacío', async () => {
    const wrapper = mountSheet({ catalogLibraries: ['BFCCA', 'BGEN', 'BHTM'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([true, true, true]);
    await save();
    expect(sentLibraries()).toBe('[]');
    wrapper.unmount();
  });

  it('sin ninguna marcada no deja guardar y lleva a la pestaña de bibliotecas', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    await tab('Bibliotecas');
    await tick('LAGUACOTO');
    await tick('MATRIZ');
    await tick('SAN MIGUEL');
    await tab('Datos');
    await save();

    expect(updateAcademicRecord).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Marque al menos una biblioteca.');
    wrapper.unmount();
  });

  it('una biblioteca guardada que Koha ya no publica se muestra para poder quitarla', async () => {
    const wrapper = mountSheet({ catalogLibraries: ['BVIEJA', 'BGEN'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(isChecked('BVIEJA (ya no está en Koha)')).toBe(true);
    wrapper.unmount();
  });

  it('las carreras y los períodos no tienen pestañas ni consultan Koha', async () => {
    const wrapper = mountSheet({ entity: 'carrera', recordName: 'Software', facultyId: 'f1', faculties: [{ id: 'f1', nombre: 'Facultad', activo: true }], modalityOptions: [{ value: 'presencial', label: 'Presencial' }] });
    await flushPromises();

    expect(document.querySelector('[role="tab"]')).toBeNull();
    expect(getCatalogLibraries).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
