import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadDocument, getDocuments, type DocumentsPayload } from '@/api/documents';
import { getSession } from '@/api/session';
import DocumentsPage from '@/pages/DocumentsPage.vue';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { revision: 'revision-1' }, fullPath: '/docente/revisiones/revision-1/documentos' }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/documents', () => ({ getDocuments: vi.fn(), downloadDocument: vi.fn(), requestDocuments: vi.fn() }));

const payload = (estado: string, files: DocumentsPayload['artifacts'][number]['files']): DocumentsPayload => ({
  syllabus: { id: 'syllabus-1', subject: 'Arquitectura de Software', code: 'SW-601', period: '2026-2027' },
  revision: { id: 'revision-1', number: 2, approved_at: '2026-10-01T10:00:00Z', approved_by: 'Biblioteca Demo' },
  artifacts: [{ id: 'artifact-1', estado, requested_at: '2026-10-01T10:00:00Z', completed_at: null, error: null, files }],
});

const mountPage = () => mount(DocumentsPage, { attachTo: document.body, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', name: 'Docente', email: 'd@example.test', email_verified: true, can_edit_identity: false }, active_role: { id: 'r1', code: 'docente', career_id: null, career_name: null }, available_roles: [] });
    vi.mocked(downloadDocument).mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('solo ofrece ver y descargar el PDF', async () => {
    vi.mocked(getDocuments).mockResolvedValue(payload('completado', { pdf_size: 2048 }));
    vi.mocked(downloadDocument).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('button').map((button) => button.text());
    expect(labels).toEqual(expect.arrayContaining(['Ver PDF', 'Descargar PDF']));
    expect(wrapper.text()).not.toContain('DOCX');
    expect(wrapper.text()).not.toContain('Generar');
    expect(wrapper.text()).not.toContain('tres firmas');
    await wrapper.findAll('button').find((button) => button.text() === 'Descargar PDF')!.trigger('click');
    await flushPromises();
    expect(downloadDocument).toHaveBeenCalledWith('artifact-1');
    wrapper.unmount();
  });

  it('avisa mientras el PDF se genera', async () => {
    vi.mocked(getDocuments).mockResolvedValue(payload('pendiente', null));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Generando el PDF');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Descargar PDF')).toBe(false);
    wrapper.unmount();
  });
});
