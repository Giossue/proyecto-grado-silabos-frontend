import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTeacherSupportDocuments, viewSupportDocument, type SupportDocument } from '@/api/support-documents';
import SupportDocumentsButton from '@/components/domain/academic/SupportDocumentsButton.vue';

vi.mock('@/api/support-documents', () => ({
  getTeacherSupportDocuments: vi.fn(),
  viewSupportDocument: vi.fn(),
}));

const doc = (id: string, title: string, view: SupportDocument['view'] = 'lista'): SupportDocument => ({
  id, title, view, size: 2048, uploaded_at: '2026-11-02T15:00:00Z',
});
const dialog = (): HTMLElement | null => document.body.querySelector<HTMLElement>('[role="dialog"]');

describe('Botón «Documentos de apoyo» del docente', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    URL.createObjectURL = vi.fn(() => 'blob:vista');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('no aparece si la coordinación no subió documentos', async () => {
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [] });
    const wrapper = mount(SupportDocumentsButton, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('[aria-label="Documentos de apoyo"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('no aparece si la lista no se pudo cargar', async () => {
    vi.mocked(getTeacherSupportDocuments).mockRejectedValue(new Error('sin red'));
    const wrapper = mount(SupportDocumentsButton, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('[aria-label="Documentos de apoyo"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('con documentos, el botón abre un modal con cada archivo y cada uno se abre en una ventana aparte', async () => {
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [doc('d1', 'Proyecto de carrera'), doc('d2', 'Guía TIC y TAC')] });
    const tab = { location: { href: '' }, close: vi.fn(), focus: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(viewSupportDocument).mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    const wrapper = mount(SupportDocumentsButton, { attachTo: document.body });
    await flushPromises();

    await wrapper.get('[aria-label="Documentos de apoyo"]').trigger('click');
    await flushPromises();
    expect(dialog()?.textContent).toContain('Documentos de apoyo');
    expect(dialog()?.textContent).toContain('Proyecto de carrera');
    expect(dialog()?.textContent).toContain('Guía TIC y TAC');

    dialog()!.querySelector<HTMLButtonElement>('[aria-label="Abrir Guía TIC y TAC"]')!.click();
    await flushPromises();
    expect(viewSupportDocument).toHaveBeenCalledWith('d2');
    expect(window.open).toHaveBeenCalledWith('', 'silabos-pdf', expect.stringContaining('popup=yes'));
    expect(tab.location.href).toBe('blob:vista');
    wrapper.unmount();
  });

  it('un documento sin vista lista no se puede abrir y dice por qué', async () => {
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [doc('d1', 'Malla', 'pendiente'), doc('d2', 'Horario', 'sin_vista')] });
    const wrapper = mount(SupportDocumentsButton, { attachTo: document.body });
    await flushPromises();
    await wrapper.get('[aria-label="Documentos de apoyo"]').trigger('click');
    await flushPromises();

    expect(dialog()!.querySelector<HTMLButtonElement>('[aria-label="Abrir Malla"]')!.disabled).toBe(true);
    expect(dialog()!.querySelector<HTMLButtonElement>('[aria-label="Abrir Horario"]')!.disabled).toBe(true);
    expect(dialog()?.textContent).toContain('Preparando vista');
    expect(dialog()?.textContent).toContain('No se pudo preparar la vista');
    wrapper.unmount();
  });

  it('si el documento no se puede abrir, cierra la ventana y lo avisa', async () => {
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [doc('d1', 'Proyecto de carrera')] });
    const tab = { location: { href: '' }, close: vi.fn(), focus: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(viewSupportDocument).mockRejectedValue(new Error('falló'));
    const wrapper = mount(SupportDocumentsButton, { attachTo: document.body });
    await flushPromises();
    await wrapper.get('[aria-label="Documentos de apoyo"]').trigger('click');
    await flushPromises();

    dialog()!.querySelector<HTMLButtonElement>('[aria-label="Abrir Proyecto de carrera"]')!.click();
    await flushPromises();
    expect(tab.close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
