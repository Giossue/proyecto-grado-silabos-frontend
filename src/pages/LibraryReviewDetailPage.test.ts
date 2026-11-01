import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, verifyLibraryReview, type LibraryReviewDetail } from '@/api/library';
import { makeTestP12 } from '@/lib/signature/testCertificate';
import LibraryReviewDetailPage from '@/pages/LibraryReviewDetailPage.vue';
import { confirmSignatureDialog, fillSignatureDialog } from '@/test/signatureDialog';

const { toastSuccess, openRevisionPdf } = vi.hoisted(() => ({ toastSuccess: vi.fn(), openRevisionPdf: vi.fn() }));

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
vi.mock('@/lib/openPdf', () => ({ openRevisionPdf }));
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
  outcome: null,
  can_comment: true,
  can_verify: true,
  signing_statement: 'silabos-ueb|silabo:syllabus-1|accion:aprobacion_biblioteca|huella:abc',
  signatures: [],
  verified_at: null,
  verified_by: null,
  template_variables: {},
  sections: [{
    key: 'bibliografia',
    title: 'Bibliografía',
    fields: [{ key: 'basica', label: 'Bibliografía básica', quien_llena: 'docente', value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sommerville, Ingeniería de software, 10.ª ed' }] }] } }],
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
  global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
});

const headerButton = (wrapper: ReturnType<typeof mountPage>, name: string) =>
  wrapper.findAll('header button').find((button) => button.text() === name);
const openReturn = async (wrapper: ReturnType<typeof mountPage>): Promise<void> => {
  await headerButton(wrapper, 'Devolver al docente')!.trigger('click');
  await flushPromises();
};
const reasonBoxes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#library-comment-form [role="checkbox"]')];
const submitReturn = async (): Promise<void> => {
  document.querySelector<HTMLFormElement>('#library-comment-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
};

describe('LibraryReviewDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getLibraryReview).mockReset();
    vi.mocked(commentLibraryReview).mockReset();
    vi.mocked(verifyLibraryReview).mockReset();
    toastSuccess.mockReset();
    document.body.innerHTML = '';
  });

  it('muestra solo asignatura, carrera, docente y la bibliografía', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(getLibraryReview).toHaveBeenCalledWith('revision-2');
    const text = wrapper.text();
    expect(text).toContain('Arquitectura de Software');
    expect(text).toContain('Software · Docente Demo');
    expect(text).toContain('Bibliografía básica');
    expect(text).toContain('Sommerville, Ingeniería de software');
    expect(text).not.toContain('Revisión 2');
    expect(text).not.toContain('Enviado por');
    expect(text).not.toContain('Por revisar');
    expect(headerButton(wrapper, 'Devolver al docente')).toBeDefined();
    expect(headerButton(wrapper, 'Firmar y aprobar')).toBeDefined();
    wrapper.unmount();
  });

  it('firma y aprueba la bibliografía', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({ state: 'atendido', outcome: 'firmado', can_verify: false, can_comment: false, signing_statement: null }) });
    vi.mocked(verifyLibraryReview).mockResolvedValue({ message: 'Sílabo aprobado' });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, 'Firmar y aprobar')!.trigger('click');
    await flushPromises();
    expect(verifyLibraryReview).not.toHaveBeenCalled();
    await fillSignatureDialog(makeTestP12('BIBLIOTECA DEMO', 'clave'), 'clave');
    await confirmSignatureDialog();

    expect(verifyLibraryReview).toHaveBeenCalledWith('revision-2', {
      statement: 'silabos-ueb|silabo:syllabus-1|accion:aprobacion_biblioteca|huella:abc',
      cms: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
    });
    expect(toastSuccess).toHaveBeenCalledWith('Sílabo aprobado');
    expect(wrapper.text()).toContain('Aprobado');
    expect(headerButton(wrapper, 'Firmar y aprobar')).toBeUndefined();
    wrapper.unmount();
  });

  it('con «Otro motivo» pide escribirlo y lo envía junto a los motivos marcados', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({
      comment_reasons: [
        { code: 'libro_no_disponible', label: 'El libro no está disponible en biblioteca' },
        { code: 'otro', label: 'Otro motivo' },
      ],
    }) });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente' });
    const wrapper = mountPage();
    await flushPromises();

    await openReturn(wrapper);
    for (const box of reasonBoxes()) box.click();
    await flushPromises();
    await submitReturn();
    expect(document.body.textContent).toContain('Escriba el otro motivo (mínimo 5 caracteres)');
    expect(commentLibraryReview).not.toHaveBeenCalled();

    const textarea = document.querySelector<HTMLTextAreaElement>('#library-other-reason')!;
    textarea.value = 'Falta la 3.ª edición de Pressman';
    textarea.dispatchEvent(new Event('input'));
    await flushPromises();
    await submitReturn();

    expect(commentLibraryReview).toHaveBeenCalledWith('revision-2', {
      reasons: ['libro_no_disponible', 'otro'],
      other: 'Falta la 3.ª edición de Pressman',
    });
    wrapper.unmount();
  });

  it('devuelve el sílabo con los motivos marcados', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({ state: 'atendido', outcome: 'devuelto', can_comment: false, can_verify: false }) });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente' });
    const wrapper = mountPage();
    await flushPromises();

    await openReturn(wrapper);
    for (const box of reasonBoxes()) box.click();
    await flushPromises();
    await submitReturn();

    expect(commentLibraryReview).toHaveBeenCalledWith('revision-2', {
      reasons: ['libro_no_disponible', 'codigo_incorrecto'],
    });
    expect(toastSuccess).toHaveBeenCalledWith('Comentario enviado al docente');
    expect(wrapper.text()).toContain('Devuelto al docente');
    expect(headerButton(wrapper, 'Devolver al docente')).toBeUndefined();
    wrapper.unmount();
  });

  it('no devuelve sin motivos', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    await openReturn(wrapper);
    await submitReturn();

    expect(document.body.textContent).toContain('Elija al menos un motivo');
    expect(commentLibraryReview).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('distingue un fallo inicial de carga y permite reintentar', async () => {
    vi.mocked(getLibraryReview).mockRejectedValueOnce(new ApiError('Revisión no disponible', 503));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Revisión no disponible');
    vi.mocked(getLibraryReview).mockResolvedValueOnce({ review: detail() });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(getLibraryReview).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Bibliografía básica');
    wrapper.unmount();
  });

  it('con el sílabo aprobado ofrece el ícono «Ver PDF», también en el historial', async () => {
    openRevisionPdf.mockResolvedValue(null);
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({ state: 'atendido', outcome: 'firmado', verified_at: '2026-10-01T10:00:00Z', verified_by: 'Bibliotecario Demo', can_comment: false, can_verify: false, signing_statement: null }) });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('button[aria-label="Ver PDF"]').trigger('click');

    expect(openRevisionPdf).toHaveBeenCalledWith('revision-2');
    wrapper.unmount();
  });

  it('sin aprobar no ofrece «Ver PDF»', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('button[aria-label="Ver PDF"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('si se llegó desde el historial, el enlace de arriba vuelve al historial', async () => {
    window.history.replaceState({ back: '/biblioteca/historial?period=all' }, '');
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Volver al historial');
    expect(wrapper.text()).not.toContain('Volver a revisiones');
    window.history.replaceState(null, '');
    wrapper.unmount();
  });
});
