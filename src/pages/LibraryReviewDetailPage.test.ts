import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, verifyLibraryReview, type LibraryReviewDetail } from '@/api/library';
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
  verifyLibraryReview: vi.fn(),
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
  can_verify: true,
  verified_at: null,
  verified_by: null,
  template_variables: {},
  sections: [{
    key: 'bibliografia',
    title: 'Bibliografía',
    fields: [{ key: 'basica', label: 'Bibliografía básica', quien_llena: 'docente', value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sommerville, Ingeniería de software, 10.ª ed.' }] }] } }],
  }],
  comments: [],
  comment_reasons: [
    { code: 'libro_no_disponible', label: 'El libro no está disponible en biblioteca' },
    { code: 'codigo_incorrecto', label: 'El código del libro es incorrecto' },
  ],
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
    vi.mocked(verifyLibraryReview).mockReset();
    toastSuccess.mockReset();
    document.body.innerHTML = '';
  });

  it('aprueba la bibliografía con confirmación y luego muestra la firma', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({ state: 'por_firmar', can_verify: false, can_comment: false, verified_at: '2026-09-29T10:00:00-05:00', verified_by: 'Biblioteca Demo' }) });
    vi.mocked(verifyLibraryReview).mockResolvedValue({ message: 'Bibliografía aprobada.' });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="signature-card"]').exists()).toBe(false);
    await wrapper.findAll('button').find((item) => item.text().includes('Aprobar bibliografía'))!.trigger('click');
    await flushPromises();
    expect(verifyLibraryReview).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')]
      .find((item) => item.textContent?.includes('Aprobar bibliografía')) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(verifyLibraryReview).toHaveBeenCalledWith('revision-2');
    expect(toastSuccess).toHaveBeenCalledWith('Bibliografía aprobada.');
    expect(wrapper.text()).toContain('Por firmar');
    expect(wrapper.get('[data-testid="signature-card"]').text()).toBe('revision-2');
    wrapper.unmount();
  });

  it('muestra solo la bibliografía en lectura, sin firma mientras falta verificar', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(getLibraryReview).toHaveBeenCalledWith('revision-2');
    expect(wrapper.text()).toContain('Bibliografía básica');
    expect(wrapper.text()).toContain('Sommerville, Ingeniería de software');
    expect(wrapper.text()).toContain('Por revisar');
    expect(wrapper.find('[data-testid="signature-card"]').exists()).toBe(false);
    expect(wrapper.find('#library-comment-form').exists()).toBe(true);
    expect(wrapper.find('#library-comment-form textarea').exists()).toBe(false);
    expect(wrapper.find('#library-comment-form').text()).toContain('El libro no está disponible en biblioteca');
    wrapper.unmount();
  });

  it('con «Otro motivo» pide escribirlo y lo envía junto a los motivos marcados', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({
      comment_reasons: [
        { code: 'libro_no_disponible', label: 'El libro no está disponible en biblioteca' },
        { code: 'otro', label: 'Otro motivo' },
      ],
    }) });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente.' });
    const wrapper = mountPage();
    await flushPromises();

    const boxes = wrapper.findAll('#library-comment-form [role="checkbox"]');
    await boxes[0]!.trigger('click');
    await boxes[1]!.trigger('click');
    const textarea = wrapper.get('#library-other-reason');
    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Escriba el otro motivo con al menos 5 caracteres.');
    expect(document.body.textContent).not.toContain('¿Devolver el sílabo al docente?');

    await textarea.setValue('Falta la 3.ª edición de Pressman.');
    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')]
      .find((item) => item.textContent?.includes('Devolver al docente')) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(commentLibraryReview).toHaveBeenCalledWith('revision-2', {
      reasons: ['libro_no_disponible', 'otro'],
      other: 'Falta la 3.ª edición de Pressman.',
    });
    wrapper.unmount();
  });

  it('pide confirmación antes de devolver el sílabo con los motivos marcados', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({
        state: 'comentado',
        can_comment: false,
        can_verify: false,
        comments: [{ comment: 'No está disponible la 10.ª edición.', commented_at: '2026-09-29T09:00:00-05:00', commented_by: 'Biblioteca Demo', revision_number: 2 }],
      }) });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente.' });
    const wrapper = mountPage();
    await flushPromises();

    const boxes = wrapper.findAll('#library-comment-form [role="checkbox"]');
    await boxes[0]!.trigger('click');
    await boxes[1]!.trigger('click');
    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();

    expect(commentLibraryReview).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('¿Devolver el sílabo al docente?');
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')]
      .find((item) => item.textContent?.includes('Devolver al docente')) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(commentLibraryReview).toHaveBeenCalledWith('revision-2', {
      reasons: ['libro_no_disponible', 'codigo_incorrecto'],
    });
    expect(toastSuccess).toHaveBeenCalledWith('Comentario enviado al docente.');
    expect(wrapper.text()).toContain('Con comentario');
    expect(wrapper.text()).toContain('Biblioteca Demo');
    expect(wrapper.find('#library-comment-form').exists()).toBe(false);
    wrapper.unmount();
  });

  it('no abre la confirmación sin motivos', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('#library-comment-form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Elija al menos un motivo.');
    expect(document.body.textContent).not.toContain('¿Devolver el sílabo al docente?');
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
