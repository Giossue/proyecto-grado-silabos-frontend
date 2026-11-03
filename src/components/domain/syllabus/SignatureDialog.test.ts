import { flushPromises, mount } from '@vue/test-utils';
import forge from 'node-forge';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
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

const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});
const dialogStubs = { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough, DialogClose: passthrough, DialogTrigger: passthrough };

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

    expect((document.querySelector('[data-testid="signature-form"] button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
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

  it('al cerrar conserva el archivo y la clave mientras se desvanece, y los borra al volver a abrir', async () => {
    const wrapper = mount(SignatureDialog, {
      attachTo: document.body,
      props: { open: true, title: 'Firmar y enviar a biblioteca', confirmLabel: 'Firmar y enviar', run: vi.fn(), 'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }) },
      global: { stubs: dialogStubs },
    });
    await flushPromises();
    await fillSignatureDialog(p12, 'clave');
    wrapper.getComponent(fadingDialog).vm.$emit('update:open', false);
    await flushPromises();

    const submit = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[data-testid="signature-form"] button[type="submit"]')!;
    expect(wrapper.getComponent(fadingDialog).attributes('data-state')).toBe('closed');
    expect(document.querySelector<HTMLInputElement>('#signature-password')!.value).toBe('clave');
    expect(submit().disabled).toBe(false);
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.querySelector<HTMLInputElement>('#signature-password')!.value).toBe('');
    expect(submit().disabled).toBe(true);
    wrapper.unmount();
  });
});
