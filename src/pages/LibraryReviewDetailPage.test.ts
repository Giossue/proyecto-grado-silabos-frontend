import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { commentLibraryReview, getLibraryReview, verifyLibraryReview, type LibraryReviewDetail } from '@/api/library';
import { makeTestP12 } from '@/lib/signature/testCertificate';
import LibraryReviewDetailPage from '@/pages/LibraryReviewDetailPage.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';
import { confirmSignatureDialog, fillSignatureDialog } from '@/test/signatureDialog';

const { toastSuccess, openRevisionPdf, replace } = vi.hoisted(() => ({ toastSuccess: vi.fn(), openRevisionPdf: vi.fn(), replace: vi.fn() }));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { revision: 'revision-2' }, fullPath: '/biblioteca/revisiones/revision-2' }),
  useRouter: () => ({ replace, push: vi.fn() }),
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
  presentation: { appearance: {}, title: 'PROGRAMA DE ASIGNATURA (SÍLABO)', logos: { institution: '/ueb.png', faculty: '/facultad.png' } } as unknown as LibraryReviewDetail['presentation'],
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

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement('style');
  style.dataset.exit = '';
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};

describe('LibraryReviewDetailPage', () => {
  beforeEach(() => {
    document.head.querySelectorAll('style[data-exit]').forEach((style) => style.remove());
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
    expect(headerButton(wrapper, 'Firmar y enviar a coordinación')).toBeDefined();
    expect(headerButton(wrapper, 'Enviar a coordinación')).toBeUndefined();
    wrapper.unmount();
  });

  it('firma la bibliografía y la envía a coordinación', async () => {
    vi.mocked(getLibraryReview)
      .mockResolvedValueOnce({ review: detail() })
      .mockResolvedValueOnce({ review: detail({ state: 'atendido', outcome: 'firmado', can_verify: false, can_comment: false, signing_statement: null }) });
    vi.mocked(verifyLibraryReview).mockResolvedValue({ message: 'Sílabo firmado y enviado a coordinación.' });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, 'Firmar y enviar a coordinación')!.trigger('click');
    await flushPromises();
    expect(verifyLibraryReview).not.toHaveBeenCalled();
    await fillSignatureDialog(makeTestP12('BIBLIOTECA DEMO', 'clave'), 'clave');
    await confirmSignatureDialog();

    expect(verifyLibraryReview).toHaveBeenCalledWith('revision-2', {
      statement: 'silabos-ueb|silabo:syllabus-1|accion:aprobacion_biblioteca|huella:abc',
      cms: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
    });
    expect(toastSuccess).toHaveBeenCalledWith('Sílabo firmado y enviado a coordinación.');
    // Vuelve a la lista cuando el diálogo terminó de cerrarse.
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/biblioteca/revisiones'));
    wrapper.unmount();
  });

  it('si Biblioteca ya firmó el sílabo, lo envía a coordinación sin volver a firmar', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({ signing_statement: null }) });
    vi.mocked(verifyLibraryReview).mockResolvedValue({ message: 'Sílabo firmado y enviado a coordinación.' });
    const wrapper = mountPage();
    await flushPromises();

    expect(headerButton(wrapper, 'Firmar y enviar a coordinación')).toBeUndefined();
    await headerButton(wrapper, 'Enviar a coordinación')!.trigger('click');
    await flushPromises();

    expect(verifyLibraryReview).toHaveBeenCalledWith('revision-2', null);
    expect(toastSuccess).toHaveBeenCalledWith('Sílabo firmado y enviado a coordinación.');
    expect(replace).toHaveBeenCalledWith('/biblioteca/revisiones');
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
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/biblioteca/revisiones'));
    wrapper.unmount();
  });

  it('solo ofrece el PDF, sin el ícono «Ver sílabo»', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('button[aria-label="Ver sílabo"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('si otro bibliotecario revisó el sílabo antes, avisa quién lo atiende y pide confirmar antes de actuar', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({ assigned_to_other: true, responsible: 'Bibliotecaria Ana' }) });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Lo atiende Bibliotecaria Ana, que lo revisó antes');
    await headerButton(wrapper, 'Devolver al docente')!.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('¿Quiere continuar usted?');
    expect(document.body.querySelector('#library-comment-form')).toBeNull();

    const next = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Continuar')!;
    next.click();
    await flushPromises();
    expect(document.body.querySelector('#library-comment-form')).not.toBeNull();
    wrapper.unmount();
  });

  it('no devuelve sin motivos', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    const wrapper = mountPage();
    await flushPromises();

    await openReturn(wrapper);
    const send = document.querySelector<HTMLButtonElement>('#library-comment-form button[type="submit"]')!;
    expect(send.disabled).toBe(true);
    await submitReturn();

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
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({ state: 'atendido', outcome: 'firmado', verified_at: '2026-10-01T10:00:00Z', verified_by: 'Bibliotecario Demo', approved_at: '2026-10-02T10:00:00Z', can_comment: false, can_verify: false, signing_statement: null }) });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('button[aria-label="Ver PDF"]').trigger('click');

    expect(openRevisionPdf).toHaveBeenCalledWith('revision-2');
    wrapper.unmount();
  });

  it('verificado pero sin la aprobación de Coordinación no ofrece «Ver PDF»', async () => {
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail({ state: 'atendido', outcome: 'firmado', verified_at: '2026-10-01T10:00:00Z', verified_by: 'Bibliotecario Demo', approved_at: null, can_comment: false, can_verify: false, signing_statement: null }) });
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

  it('al devolver, el diálogo se desvanece con los motivos marcados y luego vuelve a la lista', async () => {
    simulateExitAnimation();
    replace.mockReset();
    vi.mocked(getLibraryReview).mockResolvedValue({ review: detail() });
    vi.mocked(commentLibraryReview).mockResolvedValue({ message: 'Comentario enviado al docente' });
    const wrapper = mountPage();
    await flushPromises();
    await openReturn(wrapper);
    for (const box of reasonBoxes()) box.click();
    await flushPromises();

    await submitReturn();

    expect(commentLibraryReview).toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('[role="dialog"]')!.dataset.state).toBe('closed');
    expect(reasonBoxes().map((box) => box.getAttribute('aria-checked'))).toEqual(['true', 'true']);
    expect(replace).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, DIALOG_EXIT_MS));
    await flushPromises();
    expect(replace).toHaveBeenCalledWith('/biblioteca/revisiones');
    wrapper.unmount();
  });
});
