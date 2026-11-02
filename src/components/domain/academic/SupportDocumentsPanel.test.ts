import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSupportDocument,
  getCoordinationSupportDocuments,
  getTeacherSupportDocuments,
  uploadSupportDocument,
  viewSupportDocument,
  type SupportDocument,
} from '@/api/support-documents';
import SupportDocumentsPanel from '@/components/domain/academic/SupportDocumentsPanel.vue';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: {}, query: {}, fullPath: '/coordinacion/documentos-apoyo' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/api/support-documents', () => ({
  getCoordinationSupportDocuments: vi.fn(),
  getTeacherSupportDocuments: vi.fn(),
  uploadSupportDocument: vi.fn(),
  deleteSupportDocument: vi.fn(),
  viewSupportDocument: vi.fn(),
}));

const doc = (id: string, title: string, view: SupportDocument['view'] = 'lista'): SupportDocument => ({
  id, title, view, size: 2048, uploaded_at: '2026-11-02T15:00:00Z',
});
const mountPage = (mode: 'coordination' | 'teacher', uploadOpen = false) => mount(SupportDocumentsPanel, { props: { manages: mode === 'coordination', uploadOpen }, attachTo: document.body });

describe('Documentos de apoyo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(getCoordinationSupportDocuments).mockResolvedValue({ data: [doc('d1', 'Proyecto de carrera'), doc('d2', 'TIC TAC', 'sin_vista')] });
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [doc('d1', 'Proyecto de carrera')] });
    URL.createObjectURL = vi.fn(() => 'blob:vista');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('el docente ve la lista sin subir ni eliminar y abre el documento en una ventana aparte', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), focus: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(viewSupportDocument).mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    const wrapper = mountPage('teacher');
    await flushPromises();

    expect(wrapper.text()).toContain('Proyecto de carrera');
    expect(wrapper.text()).not.toContain('PDF');
    expect(wrapper.find('[data-table-actions]').exists()).toBe(false);
    expect(document.body.querySelector('[data-testid="support-document-form"]')).toBeNull();
    expect(getCoordinationSupportDocuments).not.toHaveBeenCalled();

    await wrapper.get('[aria-label="Ver Proyecto de carrera"]').trigger('click');
    await flushPromises();
    expect(viewSupportDocument).toHaveBeenCalledWith('d1');
    expect(window.open).toHaveBeenCalledWith('', 'silabos-pdf', expect.stringContaining('popup=yes'));
    expect(tab.location.href).toBe('blob:vista');
    expect(tab.focus).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('un documento sin vista previa no se abre al pulsar la fila', async () => {
    const wrapper = mountPage('coordination');
    await flushPromises();

    expect(wrapper.find('[aria-label="Ver TIC TAC"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('No se pudo preparar la vista');
    expect(wrapper.text()).not.toContain('Excel');
    wrapper.unmount();
  });

  it('Coordinación sube un documento con el nombre que escribe y Subir queda deshabilitado hasta completar ambos', async () => {
    vi.mocked(uploadSupportDocument).mockResolvedValue({ message: 'Documento subido.', document: doc('d3', 'Habilidades blandas', 'pendiente') });
    const wrapper = mountPage('coordination', true);
    await flushPromises();

    const form = document.body.querySelector<HTMLFormElement>('[data-testid="support-document-form"]')!;
    const submit = Array.from(form.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Subir')!;
    expect(submit.disabled).toBe(true);

    const input = form.querySelector<HTMLInputElement>('#support-document-file')!;
    const file = new File(['contenido'], 'habilidades_blandas.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await flushPromises();

    const title = form.querySelector<HTMLInputElement>('#support-document-title')!;
    expect(title.value).toBe('');
    expect(submit.disabled).toBe(true);
    title.value = 'Habilidades blandas';
    title.dispatchEvent(new Event('input'));
    await flushPromises();
    expect(submit.disabled).toBe(false);
    form.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(uploadSupportDocument).toHaveBeenCalledWith('Habilidades blandas', file);
    expect(wrapper.text()).toContain('Preparando vista');
    wrapper.unmount();
  });

  it('Coordinación elimina un documento tras confirmar', async () => {
    vi.mocked(deleteSupportDocument).mockResolvedValue({ message: 'Documento eliminado.' });
    const wrapper = mountPage('coordination');
    await flushPromises();

    await wrapper.get('[aria-label="Acciones de Proyecto de carrera"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    const remove = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) => item.textContent?.trim() === 'Eliminar')!;
    remove.click();
    await flushPromises();

    const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((button) => button.textContent?.trim() === 'Eliminar')!;
    confirm.click();
    await flushPromises();

    expect(deleteSupportDocument).toHaveBeenCalledWith('d1');
    expect(wrapper.text()).not.toContain('Proyecto de carrera');
    wrapper.unmount();
  });
});
