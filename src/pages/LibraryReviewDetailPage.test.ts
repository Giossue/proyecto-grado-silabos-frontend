import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, type LibraryReviewDetail } from '@/api/library';
import LibraryReviewDetailPage from '@/pages/LibraryReviewDetailPage.vue';

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { revision: 'revision-2' }, fullPath: '/biblioteca/revisiones/revision-2' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/api/library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/library')>()),
  getLibraryReview: vi.fn(),
  commentLibraryReview: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({ toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() } }));

const detail = (overrides: Partial<LibraryReviewDetail> = {}): LibraryReviewDetail => ({
  revision_id: 'revision-2',
  syllabus_id: 'syllabus-1',
  subject: 'Arquitectura de Software',
  code: 'SW-601',
  career: 'Software',
  period: '2026-2027',
  parallels: ['A'],
  teachers: ['Docente Demo'],
  revision_number: 2,
  sent_at: '2026-09-28T10:00:00-05:00',
  sent_by: 'Docente Demo',
  state: 'pendiente',
  can_comment: true,
  template_variables: {},
  sections: [{
    key: 'bibliografia',
    title: 'Bibliografía',
    blocks: [{
      key: 'bibliografia',
      title: 'Bibliografía',
      content_type: 'text',
      fields: [{ key: 'basica', label: 'Bibliografía básica', type: 'texto_largo', inherited: false, value: 'Sommerville, Ingeniería de software, 10.ª ed.' }],
    }],
  }],
  comments: [],
  ...overrides,
});

const mountPage = () => mount(LibraryReviewDetailPage, {
  attachTo: document.body,
  global: {
    stubs: {
      RouterLink: { template: '<a><slot /></a>' },
      DocumentSignatureCard: { props: ['revisionId'], template: '<div data-testid="signature-card">{{ revisionId }}</div>' },
    },
  },
});

describe('LibraryReviewDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getLibraryReview).mockReset();
    vi.mocked(commentLibraryReview).mockReset();
    toastSuccess.mockReset();
    document.body.innerHTML = '';
  });

  it('muestra solo la bibliografía en lectura y la firma de la revisión', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(getLibraryReview).toHaveBeenCalledWith('revision-2');
    expect(wrapper.text()).toContain('Bibliografía básica');
    expect(wrapper.text()).toContain('Sommerville, Ingeniería de software');
    expect(wrapper.text()).toContain('Por verificar');
    expect(wrapper.get('[data-testid="signature-card"]').text()).toBe('revision-2');
    expect(wrapper.find('#library-comment').exists()).toBe(true);
    wrapper.unmount();
  });

  it('pide confirmación antes de enviar el comentario al docente', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({
        state: 'comentado',
        can_comment: false,
        comments: [{ comment: 'No está disponible la 10.ª edición.', commented_at: '2026-09-29T09:00:00-05:00', commented_by: 'Biblioteca Demo', revision_number: 2 }],
      }) });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente.' });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('#library-comment').setValue('No está disponible la 10.ª edición.');
    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();

    expect(commentLibraryReview).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('¿Enviar comentario al docente?');
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')]
      .find((item) => item.textContent?.includes('Enviar comentario')) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(commentLibraryReview).toHaveBeenCalledWith('revision-2', {
      comment: 'No está disponible la 10.ª edición.',
      idempotency_key: expect.any(String),
    });
    expect(toastSuccess).toHaveBeenCalledWith('Comentario enviado al docente.');
    expect(wrapper.text()).toContain('Con comentario');
    expect(wrapper.text()).toContain('Biblioteca Demo');
    expect(wrapper.find('#library-comment').exists()).toBe(false);
    wrapper.unmount();
  });

  it('no abre la confirmación con un comentario vacío', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Escriba qué libros no están disponibles');
    expect(document.body.textContent).not.toContain('¿Enviar comentario al docente?');
    wrapper.unmount();
  });

  it('distingue un fallo inicial de carga y permite reintentar', async () => {
    vi.mocked(getLibraryReview).mockRejectedValueOnce(new ApiError('Revisión no disponible.', 503));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Revisión no disponible.');
    vi.mocked(getLibraryReview).mockResolvedValueOnce({ review: detail() });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(getLibraryReview).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Bibliografía básica');
    wrapper.unmount();
  });
});
