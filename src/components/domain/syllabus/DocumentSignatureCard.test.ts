import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { SignatureStatus } from '@/api/signatures';
import DocumentSignatureCard from '@/components/domain/syllabus/DocumentSignatureCard.vue';
import { SignatureError } from '@/lib/signature/certificate';

const { getSignatureStatus, downloadSignaturePdf, submitSignature, sendToLibrary, signPdf, sha256Hex, toastSuccess } = vi.hoisted(() => ({
  getSignatureStatus: vi.fn(),
  downloadSignaturePdf: vi.fn(),
  submitSignature: vi.fn(),
  sendToLibrary: vi.fn(),
  signPdf: vi.fn(),
  sha256Hex: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock('@/api/signatures', () => ({ getSignatureStatus, downloadSignaturePdf, submitSignature, sendToLibrary }));
vi.mock('@/lib/signature/signPdf', () => ({ signPdf, sha256Hex }));
vi.mock('@/lib/toast', () => ({ toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() } }));

const status = (overrides: Partial<SignatureStatus> = {}): SignatureStatus => ({
  state: 'pendiente_docente',
  next_role: 'docente',
  my_role: 'docente',
  can_sign: true,
  can_send_to_library: false,
  library: null,
  artifact_id: 'artifact-1',
  document: { sha256: 'a'.repeat(64), size: 10 },
  stamp: { page: 1, x: 60, y: 300, width: 190, height: 48 },
  signatures: [],
  ...overrides,
});

const wrappers: Array<{ unmount: () => void }> = [];
const mountCard = async () => {
  const wrapper = mount(DocumentSignatureCard, { props: { revisionId: 'rev-1', fileName: 'silabo-SW-401' }, attachTo: document.body });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
};
const button = (label: string): HTMLButtonElement =>
  [...document.body.querySelectorAll('button')].find((item) => item.textContent?.includes(label)) as HTMLButtonElement;

const fillDialog = async (password = 'secreta'): Promise<void> => {
  const input = document.body.querySelector<HTMLInputElement>('#signature-certificate')!;
  const file = new File([new Uint8Array([1, 2, 3])], 'firma.p12', { type: 'application/x-pkcs12' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  const passwordInput = document.body.querySelector<HTMLInputElement>('#signature-password')!;
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input'));
  await flushPromises();
};

beforeEach(() => {
  downloadSignaturePdf.mockResolvedValue(new Blob([new Uint8Array([37, 80, 68, 70])]));
  sha256Hex.mockResolvedValue('b'.repeat(64));
  signPdf.mockResolvedValue({ pdf: new Uint8Array([1]), certificate: { holder: 'DOCENTE' } });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('DocumentSignatureCard', () => {
  it('firma en el navegador y solo sube el PDF firmado con la huella del documento base', async () => {
    getSignatureStatus.mockResolvedValueOnce(status()).mockResolvedValueOnce(status({
      state: 'pendiente_coordinacion', next_role: 'coordinacion', can_sign: false, stamp: null,
      signatures: [{ role: 'docente', signer: 'Docente', certificate_holder: 'DOCENTE DE PRUEBA', certificate_issuer: 'CA', signed_at: '2026-09-24T10:00:00-05:00' }],
    }));
    submitSignature.mockResolvedValue({ message: 'Firma registrada. Coordinación ya puede firmar el sílabo.', signature_id: 's-1' });
    const wrapper = await mountCard();

    expect(wrapper.text()).toContain('Pendiente docente');
    button('Firmar electrónicamente').click();
    await flushPromises();
    expect(document.body.textContent).toContain('no se envían ni se guardan');
    await fillDialog();
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(signPdf).toHaveBeenCalledWith(expect.objectContaining({ password: 'secreta', role: 'docente', stamp: status().stamp }));
    expect(submitSignature).toHaveBeenCalledTimes(1);
    const [revision, blob, base] = submitSignature.mock.calls[0]!;
    expect(revision).toBe('rev-1');
    expect(blob).toBeInstanceOf(Blob);
    expect(base).toBe('b'.repeat(64));
    expect(JSON.stringify(submitSignature.mock.calls)).not.toContain('secreta');
    expect(toastSuccess).toHaveBeenCalledWith('Firma registrada. Coordinación ya puede firmar el sílabo.');
    expect(wrapper.text()).toContain('Pendiente coordinación');
    expect(wrapper.text()).toContain('DOCENTE DE PRUEBA');
    expect(wrapper.text()).not.toContain('Firmar electrónicamente');
    expect(wrapper.text()).toContain('Descargar PDF firmado');
  });

  it('explica la clave incorrecta junto al campo de la clave', async () => {
    getSignatureStatus.mockResolvedValue(status());
    signPdf.mockRejectedValue(new SignatureError('wrong_password'));
    await mountCard();
    button('Firmar electrónicamente').click();
    await flushPromises();
    await fillDialog('mala');
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(document.body.textContent).toContain('La clave del certificado es incorrecta.');
    expect(submitSignature).not.toHaveBeenCalled();
  });

  it('avisa el certificado vencido', async () => {
    getSignatureStatus.mockResolvedValue(status());
    signPdf.mockRejectedValue(new SignatureError('expired'));
    await mountCard();
    button('Firmar electrónicamente').click();
    await flushPromises();
    await fillDialog();
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(document.body.textContent).toContain('El certificado de firma está vencido.');
  });

  it('si alguien firmó antes, ofrece volver a descargar y firmar', async () => {
    getSignatureStatus.mockResolvedValue(status());
    submitSignature
      .mockRejectedValueOnce(new ApiError('Datos inválidos', 422, { signed_pdf: ['El documento cambió mientras firmaba. Descárguelo de nuevo y vuelva a firmar.'] }))
      .mockResolvedValueOnce({ message: 'Firma registrada.', signature_id: 's-2' });
    await mountCard();
    button('Firmar electrónicamente').click();
    await flushPromises();
    await fillDialog();
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(document.body.textContent).toContain('El documento cambió mientras firmaba.');
    button('Volver a descargar y firmar').click();
    await flushPromises();
    expect(downloadSignaturePdf).toHaveBeenCalledTimes(2);
    expect(submitSignature).toHaveBeenCalledTimes(2);
    expect(toastSuccess).toHaveBeenCalledWith('Firma registrada.');
  });

  it('coordinación ve el orden: no firma antes que el docente', async () => {
    getSignatureStatus.mockResolvedValue(status({ my_role: 'coordinacion', can_sign: false, stamp: null }));
    const wrapper = await mountCard();

    expect(wrapper.text()).toContain('Primero firma el docente del sílabo.');
    expect(wrapper.text()).not.toContain('Firmar electrónicamente');
    expect(wrapper.text()).toContain('Descargar PDF');
  });

  it('el docente envía a biblioteca tras la aprobación, antes del PDF, y espera la verificación', async () => {
    getSignatureStatus
      .mockResolvedValueOnce(status({ state: 'pendiente_envio_biblioteca', next_role: null, can_sign: false, can_send_to_library: true, artifact_id: null, document: null, stamp: null, signatures: [] }))
      .mockResolvedValueOnce(status({ state: 'pendiente_verificacion_biblioteca', next_role: null, can_sign: false, artifact_id: null, document: null, stamp: null, signatures: [], library: { sent_at: '2026-09-25T09:00:00-05:00', sent_by: 'Docente de prueba', verified_at: null, verified_by: null } }));
    sendToLibrary.mockResolvedValue({ message: 'Sílabo enviado a biblioteca.' });
    const wrapper = await mountCard();

    expect(wrapper.text()).toContain('Por enviar a biblioteca');
    expect(wrapper.text()).toContain('antes de generar y firmar el PDF');
    expect(wrapper.text()).not.toContain('Descargar PDF');
    expect(wrapper.text()).not.toContain('Firmar electrónicamente');

    button('Enviar a biblioteca').click();
    await flushPromises();
    expect(document.body.textContent).toContain('¿Enviar a biblioteca?');
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')].find((item) => item.textContent?.includes('Enviar a biblioteca')) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(sendToLibrary).toHaveBeenCalledWith('rev-1');
    expect(toastSuccess).toHaveBeenCalledWith('Sílabo enviado a biblioteca.');
    expect(wrapper.emitted('changed')).toHaveLength(1);
    expect(wrapper.text()).toContain('Esperando a biblioteca');
    expect(wrapper.get('[data-testid="library-submission"]').text()).toContain('Docente de prueba');
    expect(wrapper.text()).not.toContain('Enviar a biblioteca');
  });

  it('biblioteca firma con su propio rol cuando le corresponde', async () => {
    getSignatureStatus.mockResolvedValue(status({
      state: 'pendiente_biblioteca', next_role: 'biblioteca', my_role: 'biblioteca', can_sign: true,
      library: { sent_at: '2026-09-25T09:00:00-05:00', sent_by: 'Docente de prueba', verified_at: '2026-09-26T09:00:00-05:00', verified_by: 'Biblioteca Demo' },
    }));
    submitSignature.mockResolvedValue({ message: 'Firma registrada.', signature_id: 's-3' });
    const wrapper = await mountCard();

    expect(wrapper.text()).toContain('Le corresponde firmar a biblioteca.');
    expect(wrapper.get('[data-testid="library-submission"]').text()).toContain('Bibliografía aprobada');
    button('Firmar electrónicamente').click();
    await flushPromises();
    await fillDialog();
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(signPdf).toHaveBeenCalledWith(expect.objectContaining({ role: 'biblioteca' }));
    expect(submitSignature).toHaveBeenCalledTimes(1);
  });
});
