import forge from 'node-forge';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { readCertificate, SignatureError } from '@/lib/signature/certificate';
import { CONTENTS_HEX_LENGTH, fallbackStamp, signPdf } from '@/lib/signature/signPdf';
import { makeTestP12 } from '@/lib/signature/testCertificate';

const text = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

const samplePdf = async (useObjectStreams: boolean): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage([595, 842]).drawText('Firma:', { x: 60, y: 120, size: 10, font });
  return document.save({ useObjectStreams });
};

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
  let librarian: Uint8Array;
  beforeAll(() => {
    teacher = makeTestP12('DOCENTE DE PRUEBA ÑANDÚ', 'clave-docente');
    coordinator = makeTestP12('COORDINACION DE PRUEBA', 'clave-coordinacion');
    librarian = makeTestP12('BIBLIOTECA DE PRUEBA', 'clave-biblioteca');
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

    const reopened = await PDFDocument.load(second.pdf);
    expect(reopened.getForm().getFields()).toHaveLength(2);
  });

  it('agrega la tercera firma de biblioteca con su razón y sin tocar las anteriores', async () => {
    const first = await signPdf({ pdf: await samplePdf(false), p12: teacher, password: 'clave-docente', stamp: null, role: 'docente' });
    const second = await signPdf({ pdf: first.pdf, p12: coordinator, password: 'clave-coordinacion', stamp: null, role: 'coordinacion' });
    const third = await signPdf({ pdf: second.pdf, p12: librarian, password: 'clave-biblioteca', stamp: null, role: 'biblioteca' });

    expect(Buffer.from(third.pdf.subarray(0, second.pdf.length)).equals(Buffer.from(second.pdf))).toBe(true);
    expect(verifies(third.pdf)).toBe(true);
    expect([...text(third.pdf).matchAll(/\/FT \/Sig/g)]).toHaveLength(3);
    const reason = 'Verificación de bibliografía (biblioteca)';
    const hex = [...reason].map((char) => char.charCodeAt(0).toString(16).padStart(4, '0')).join('').toUpperCase();
    expect(text(third.pdf)).toContain(`/Reason <FEFF${hex}>`);
    expect((await PDFDocument.load(third.pdf)).getForm().getFields()).toHaveLength(3);
  });

  it.each([595, 612])('ubica sin superponer los tres sellos de respaldo (ancho %i)', (width) => {
    const [teacherStamp, coordinationStamp, libraryStamp] = (['docente', 'coordinacion', 'biblioteca'] as const)
      .map((role) => fallbackStamp(role, 0, width));

    expect(teacherStamp!.x).toBe(60);
    expect(coordinationStamp!.x + coordinationStamp!.width / 2).toBeCloseTo(width / 2);
    expect(libraryStamp!.x + libraryStamp!.width).toBe(width - 60);
    expect(teacherStamp!.x + teacherStamp!.width).toBeLessThan(coordinationStamp!.x);
    expect(coordinationStamp!.x + coordinationStamp!.width).toBeLessThan(libraryStamp!.x);
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
