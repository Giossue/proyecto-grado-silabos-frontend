import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogEditDialog from '@/components/domain/academic/CatalogEditDialog.vue';
import { updateAcademicRecord } from '@/api/academic';
import { getCatalogLibraries } from '@/api/libraryCatalog';
import { ApiError } from '@/api/client';
import { FINALIZED_NOTICE, usePurgeConfirmation } from '@/composables/usePurgeConfirmation';

vi.mock('@/api/academic', () => ({ updateAcademicRecord: vi.fn() }));
vi.mock('@/api/libraryCatalog', () => ({ getCatalogLibraries: vi.fn() }));

beforeEach(() => {
  vi.mocked(getCatalogLibraries).mockResolvedValue([{ id: 'BFCCA', name: 'LAGUACOTO' }, { id: 'BGEN', name: 'MATRIZ' }, { id: 'BHTM', name: 'SAN MIGUEL' }]);
  vi.mocked(updateAcademicRecord).mockResolvedValue({ message: 'Facultad actualizada.' });
});
afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

const mountDialog = (extra: Record<string, unknown> = {}) => mount(CatalogEditDialog, {
  attachTo: document.body,
  props: {
    entity: 'facultad', recordId: 'faculty-1', recordName: 'Facultad de Ciencias', campus: 'matriz',
    faculties: [], campusOptions: [{ value: 'matriz', label: 'Campus Matriz' }], modalityOptions: [],
    logoUrl: 'https://api.example.test/logos/faculty-1.png', showTrigger: false, open: true, ...extra,
  },
});
const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.getAttribute('aria-label') === label || item.textContent?.trim() === label);

const editingDialog = async (extra: Record<string, unknown> = {}) => {
  const wrapper = mountDialog(extra);
  await flushPromises();
  Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Editar')?.click();
  await flushPromises();
  return wrapper;
};

describe('CatalogEditDialog · logo de la facultad', () => {
  it('las acciones de la esquina solo aparecen al editar', async () => {
    const wrapper = mountDialog({ actions: [{ key: 'status', label: 'Desactivar facultad' }] });
    await flushPromises();
    const action = () => document.body.querySelector('[aria-label="Desactivar facultad"]');
    expect(action()).toBeNull();

    Array.from(document.body.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Editar')!.click();
    await flushPromises();
    expect(action()).not.toBeNull();
    wrapper.unmount();
  });

  it('abre primero los datos en solo lectura, con Editar; al editar permite cambiar y Cancelar vuelve a los datos', async () => {
    const wrapper = mountDialog();
    await flushPromises();
    const button = (label: string) => Array.from(document.body.querySelectorAll('button')).find((item) => item.textContent?.trim() === label);
    const name = () => document.body.querySelector<HTMLInputElement>('input[id^="edit-name-"]')!;

    expect(name().disabled).toBe(true);
    expect(button('Guardar cambios')).toBeUndefined();

    button('Editar')!.click();
    await flushPromises();
    expect(name().disabled).toBe(false);
    expect(button('Guardar cambios')).toBeDefined();

    button('Cancelar')!.click();
    await flushPromises();
    expect(name().disabled).toBe(true);
    expect(button('Editar')).toBeDefined();
    wrapper.unmount();
  });

  it('con logo muestra la imagen con una X y no la zona de arrastre; al quitarlo aparece la zona', async () => {
    const wrapper = await editingDialog();
    await flushPromises();

    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Arrastra tu imagen aquí');

    button('Quitar logo')!.click();
    await flushPromises();
    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).toBeNull();
    expect(document.body.textContent).toContain('Arrastra tu imagen aquí');
    wrapper.unmount();
  });

  it('quitar el logo sin subir otro no deja guardar, y cancelar vuelve a mostrar el logo', async () => {
    const wrapper = await editingDialog();
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
    expect(document.body.textContent).not.toContain('Arrastra tu imagen aquí');
    wrapper.unmount();
  });
});

describe('CatalogEditDialog · convocatoria activa', () => {
  it('con la convocatoria activa deja los campos y el botón deshabilitados, sin aviso dentro del diálogo', async () => {
    const wrapper = await editingDialog({ lockReason: 'Convocatoria activa' });
    await flushPromises();

    expect(document.body.textContent).not.toContain('Hay una convocatoria activa');
    expect([...document.body.querySelectorAll<HTMLInputElement>('input[id^="edit-"]')].every((input) => input.disabled)).toBe(true);
    expect(document.body.querySelector<HTMLButtonElement>('button[id^="edit-campus-"]')?.disabled).toBe(true);
    expect(button('Editar')!.hasAttribute('disabled')).toBe(true);
    wrapper.unmount();
  });
});

describe('CatalogEditDialog · cambios que devuelven sílabos enviados', () => {
  it('con una convocatoria finalizada abre el aviso sin frase y reenvía con confirm_purge', async () => {
    vi.mocked(updateAcademicRecord)
      .mockRejectedValueOnce(new ApiError('Aviso', 422, { purge_required: ['La convocatoria 2026-2027 ya finalizó.'], purge_count: ['0'], purge_mode: [FINALIZED_NOTICE] }))
      .mockResolvedValueOnce({ message: 'Actualizado' });
    const wrapper = await editingDialog();
    const dialog = usePurgeConfirmation();
    await flushPromises();
    const name = document.querySelector<HTMLInputElement>('input[aria-required="true"]')!;
    name.value = 'Facultad con otro nombre';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    button('Guardar cambios')!.click();
    await flushPromises();

    expect(dialog.mode.value).toBe(FINALIZED_NOTICE);
    await dialog.confirm();
    await flushPromises();

    expect((vi.mocked(updateAcademicRecord).mock.calls[1]![2] as FormData).get('confirm_purge')).toBe('1');
    wrapper.unmount();
  });

  it('al cambiar el nombre pide confirmar y, al confirmar, reenvía con confirm_purge', async () => {
    vi.mocked(updateAcademicRecord)
      .mockRejectedValueOnce(new ApiError('Confirme', 422, { purge_required: ['Este cambio devolverá 1 sílabo enviado o aprobado a borrador'], purge_count: ['1'] }))
      .mockResolvedValueOnce({ message: 'Facultad actualizada.' });
    const wrapper = await editingDialog();
    await flushPromises();
    const name = document.querySelector<HTMLInputElement>('input[aria-required="true"]')!;
    name.value = 'Facultad con otro nombre';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    button('Guardar cambios')!.click();
    await flushPromises();

    const { open, message, confirm } = usePurgeConfirmation();
    expect(open.value).toBe(true);
    expect(message.value).toContain('devolverá 1 sílabo');
    await confirm();
    await flushPromises();

    expect(updateAcademicRecord).toHaveBeenCalledTimes(2);
    expect((vi.mocked(updateAcademicRecord).mock.calls[1]![2] as FormData).get('confirm_purge')).toBe('1');
    wrapper.unmount();
  });
});

describe('CatalogEditDialog · bibliotecas de Koha de la facultad', () => {
  const sentLibraries = (): string | null => (vi.mocked(updateAcademicRecord).mock.calls[0]![2] as FormData).get('catalog_libraries') as string | null;
  const row = (name: string): HTMLElement => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="field"]')).find((item) => item.textContent?.trim() === name)!;
  const isChecked = (name: string): boolean => row(name).querySelector('[role="checkbox"]')!.getAttribute('aria-checked') === 'true';
  const tick = async (name: string): Promise<void> => { row(name).querySelector<HTMLElement>('[role="checkbox"]')!.click(); await flushPromises(); };
  const tab = async (label: string): Promise<void> => { const trigger = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).find((item) => item.textContent?.trim() === label)!; trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); trigger.click(); await flushPromises(); };
  const save = async (): Promise<void> => { button('Guardar cambios')!.click(); await flushPromises(); };

  it('tiene una pestaña Bibliotecas, aparte de los datos, que solo lista las bibliotecas disponibles con casillas', async () => {
    const wrapper = await editingDialog();
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
    const wrapper = await editingDialog();
    await flushPromises();

    expect(document.querySelector('[aria-label="Qué significa esto"]')).toBeNull();
    await tab('Bibliotecas');
    expect(document.querySelector('legend [aria-label="Qué significa esto"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('sin bibliotecas guardadas muestra todas marcadas, y sin tocarlas no se puede guardar', async () => {
    const wrapper = await editingDialog();
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([true, true, true]);
    expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(true);
    expect(updateAcademicRecord).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('si Koha no responde o no publica bibliotecas, sin cambios tampoco se puede guardar, y cambiar un dato sí', async () => {
    for (const koha of [() => vi.mocked(getCatalogLibraries).mockRejectedValueOnce(new Error('Koha caído')), () => vi.mocked(getCatalogLibraries).mockResolvedValueOnce([])]) {
      koha();
      const wrapper = await editingDialog();
      await flushPromises();

      expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(true);
      const name = document.querySelector<HTMLInputElement>('input[id^="edit-name-"]')!;
      name.value = 'Facultad renombrada';
      name.dispatchEvent(new Event('input'));
      await flushPromises();
      expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(false);
      wrapper.unmount();
    }
  });

  it('desmarcar bibliotecas guarda los códigos de las que quedan', async () => {
    const wrapper = await editingDialog();
    await flushPromises();
    await tab('Bibliotecas');
    await tick('LAGUACOTO');
    await save();

    expect(sentLibraries()).toBe('["BGEN","BHTM"]');
    wrapper.unmount();
  });

  it('con bibliotecas guardadas abre con solo esas marcadas, y marcar todas se guarda vacío para que entren las nuevas', async () => {
    const wrapper = await editingDialog({ catalogLibraries: ['BGEN'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([false, true, false]);
    await tick('LAGUACOTO');
    await tick('SAN MIGUEL');
    await save();

    expect(sentLibraries()).toBe('[]');
    wrapper.unmount();
  });

  it('si la facultad ya tenía guardadas todas, se ven todas marcadas, sin cambios no se guarda y al guardar otro dato queda vacío', async () => {
    const wrapper = await editingDialog({ catalogLibraries: ['BFCCA', 'BGEN', 'BHTM'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([true, true, true]);
    expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(true);
    await tick('MATRIZ');
    await tick('MATRIZ');
    expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(true);
    await tab('Datos');
    const name = document.querySelector<HTMLInputElement>('input[id^="edit-name-"]')!;
    name.value = 'Facultad renombrada';
    name.dispatchEvent(new Event('input'));
    await flushPromises();
    await save();
    expect(sentLibraries()).toBe('[]');
    wrapper.unmount();
  });

  it('sin ninguna marcada «Guardar cambios» queda deshabilitado', async () => {
    const wrapper = await editingDialog();
    await flushPromises();
    await tab('Bibliotecas');
    await tick('LAGUACOTO');
    await tick('MATRIZ');
    await tick('SAN MIGUEL');

    expect(button('Guardar cambios')!.hasAttribute('disabled')).toBe(true);
    expect(updateAcademicRecord).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('una biblioteca guardada que Koha ya no publica se muestra para poder quitarla', async () => {
    const wrapper = await editingDialog({ catalogLibraries: ['BVIEJA', 'BGEN'] });
    await flushPromises();
    await tab('Bibliotecas');

    expect(isChecked('BVIEJA (ya no está en Koha)')).toBe(true);
    wrapper.unmount();
  });

  it('las carreras y los períodos no tienen pestañas ni consultan Koha', async () => {
    const wrapper = await editingDialog({ entity: 'carrera', recordName: 'Software', facultyId: 'f1', faculties: [{ id: 'f1', nombre: 'Facultad', activo: true }], modalityOptions: [{ value: 'presencial', label: 'Presencial' }] });
    await flushPromises();

    expect(document.querySelector('[role="tab"]')).toBeNull();
    expect(getCatalogLibraries).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
