import { flushPromises, mount } from '@vue/test-utils';
import forge from 'node-forge';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { SignaturePayload } from '@/api/signatures';
import SignatureDialog, { type StatementSigner } from '@/components/domain/syllabus/SignatureDialog.vue';
import { makeTestP12 } from '@/lib/signature/testCertificate';
import { confirmSignatureDialog, fillSignatureDialog } from '@/test/signatureDialog';

const statement = 'silabos-ueb|silabo:s1|accion:aprobacion_coordinacion|huella:abc';

const mountDialog = (run: (sign: StatementSigner) => Promise<void>) => mount(SignatureDialog, {
  attachTo: document.body,
  props: { open: true, title: 'Firmar y enviar a biblioteca', confirmLabel: 'Firmar y enviar', run },
});

const dialogText = (): string => document.querySelector('[role="dialog"]')?.textContent ?? '';

describe('SignatureDialog', () => {
  let p12: Uint8Array;
  beforeAll(() => {
    p12 = makeTestP12('COORDINACION DE PRUEBA', 'clave');
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('firma la declaración en el navegador y entrega la firma a la acción', async () => {
    let signature: SignaturePayload | null = null;
    const run = vi.fn(async (sign: StatementSigner) => { signature = sign(statement); });
    const wrapper = mountDialog(run);
    await flushPromises();

    await fillSignatureDialog(p12, 'clave');
    await confirmSignatureDialog();

    expect(run).toHaveBeenCalledOnce();
    expect(signature!.statement).toBe(statement);
    const der = forge.util.decode64(signature!.cms);
    expect((forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der, false)) as forge.pkcs7.PkcsSignedData).certificates).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('pide archivo y clave antes de firmar', async () => {
    const run = vi.fn();
    const wrapper = mountDialog(run);
    await flushPromises();

    await confirmSignatureDialog();
    expect(dialogText()).toContain('Elija su archivo .p12 o .pfx');
    expect(run).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('marca la clave incorrecta sin llamar a la acción', async () => {
    const run = vi.fn();
    const wrapper = mountDialog(run);
    await flushPromises();

    await fillSignatureDialog(p12, 'otra');
    await confirmSignatureDialog();

    expect(dialogText()).toContain('La clave del certificado es incorrecta');
    expect(run).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('muestra el error de firma del servidor y queda abierto', async () => {
    const run = vi.fn(async (sign: StatementSigner) => {
      sign(statement);
      throw new ApiError('Datos inválidos', 422, { signature: ['El titular del certificado no coincide con su cuenta'] });
    });
    const wrapper = mountDialog(run);
    await flushPromises();

    await fillSignatureDialog(p12, 'clave');
    await confirmSignatureDialog();

    expect(dialogText()).toContain('El titular del certificado no coincide con su cuenta');
    expect(wrapper.emitted('update:open')).toBeUndefined();
    wrapper.unmount();
  });
});
