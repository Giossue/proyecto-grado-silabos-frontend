// @vitest-environment node
import forge from 'node-forge';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { readCertificate, SignatureError } from '@/lib/signature/certificate';
import { CONTENTS_HEX_LENGTH, signPdf } from '@/lib/signature/signPdf';
import { makeTestP12 } from '@/lib/signature/testCertificate';

const text = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

const samplePdf = async (useObjectStreams: boolean): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage([595, 842]).drawText('Firma:', { x: 60, y: 120, size: 10, font });
  return document.save({ useObjectStreams });
};

/** Comprueba el CMS del `ByteRange` nuevo con node-forge (lo que hace OpenSSL en el backend). */
const lastSignature = (signed: Uint8Array) => {
  const body = text(signed);
  const match = [...body.matchAll(/\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\s*\]/g)].at(-1)!;
  const [a, b, c, d] = match.slice(1).map(Number) as [number, number, number, number];
  const hex = body.slice(b + 1, c - 1);
  return { a, b, c, d, hex };
};

const verifies = (signed: Uint8Array): boolean => {
  const { b, c, hex } = lastSignature(signed);
  const der = forge.util.hexToBytes(hex.replace(/(00)+$/, ''));
  const message = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der, false)) as forge.pkcs7.PkcsSignedData & {
    rawCapture: { authenticatedAttributes: forge.asn1.Asn1[]; signature: string };
  };
  const covered = Buffer.concat([Buffer.from(signed.subarray(0, b)), Buffer.from(signed.subarray(c))]);
  const digest = forge.md.sha256.create().update(covered.toString('binary')).digest().getBytes();
  const attributes = message.rawCapture.authenticatedAttributes;
  const set = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes);
  const messageDigest = attributes
    .map((attribute) => attribute.value as forge.asn1.Asn1[])
    .find((parts) => forge.asn1.derToOid((parts[0]!.value as string)) === forge.pki.oids.messageDigest!)!;
  const declared = ((messageDigest[1]!.value as forge.asn1.Asn1[])[0]!.value) as string;
  const certificate = message.certificates[0]!;
  const signedAttributes = forge.md.sha256.create().update(forge.asn1.toDer(set).getBytes());
  return declared === digest && (certificate.publicKey as forge.pki.rsa.PublicKey).verify(signedAttributes.digest().getBytes(), message.rawCapture.signature);
};

describe('firma incremental en el navegador', () => {
  let teacher: Uint8Array;
  let coordinator: Uint8Array;
  beforeAll(() => {
    teacher = makeTestP12('DOCENTE DE PRUEBA ÑANDÚ', 'clave-docente');
    coordinator = makeTestP12('COORDINACION DE PRUEBA', 'clave-coordinacion');
  });

  it.each([false, true])('agrega la firma sin tocar los bytes originales (flujos de objetos: %s)', async (useObjectStreams) => {
    const original = await samplePdf(useObjectStreams);
    const first = await signPdf({ pdf: original, p12: teacher, password: 'clave-docente', stamp: { page: 0, x: 64, y: 134, width: 190, height: 48 }, role: 'docente' });

    expect(first.certificate.holder).toBe('DOCENTE DE PRUEBA ÑANDÚ');
    expect(Buffer.from(first.pdf.subarray(0, original.length)).equals(Buffer.from(original))).toBe(true);
    const range = lastSignature(first.pdf);
    expect(range.a).toBe(0);
    expect(range.b).toBeGreaterThan(original.length);
    expect(range.c + range.d).toBe(first.pdf.length);
    expect(range.hex).toHaveLength(CONTENTS_HEX_LENGTH);
    expect(text(first.pdf)).toContain('/SubFilter /adbe.pkcs7.detached');
    expect(verifies(first.pdf)).toBe(true);

    const second = await signPdf({ pdf: first.pdf, p12: coordinator, password: 'clave-coordinacion', stamp: null, role: 'coordinacion' });
    expect(Buffer.from(second.pdf.subarray(0, first.pdf.length)).equals(Buffer.from(first.pdf))).toBe(true);
    expect(verifies(second.pdf)).toBe(true);
    expect([...text(second.pdf).matchAll(/\/FT \/Sig/g)]).toHaveLength(2);

    // pdf-lib vuelve a abrir el resultado y ve ambos campos en el formulario.
    const reopened = await PDFDocument.load(second.pdf);
    expect(reopened.getForm().getFields()).toHaveLength(2);
  });

  it('un byte alterado invalida la firma', async () => {
    const signed = (await signPdf({ pdf: await samplePdf(false), p12: teacher, password: 'clave-docente', stamp: null, role: 'docente' })).pdf;
    const tampered = signed.slice();
    tampered[20] = tampered[20]! ^ 1;
    expect(verifies(tampered)).toBe(false);
  });

  it('explica la clave incorrecta, el archivo inválido y el certificado vencido', () => {
    expect(() => readCertificate(teacher, 'otra')).toThrowError(new SignatureError('wrong_password'));
    expect(() => readCertificate(new Uint8Array([1, 2, 3]), 'x')).toThrowError(new SignatureError('invalid_file'));
    const expired = makeTestP12('VENCIDO', 'x', { from: new Date('2020-01-01'), to: new Date('2021-01-01') });
    expect(() => readCertificate(expired, 'x')).toThrowError(new SignatureError('expired'));
  });
});
