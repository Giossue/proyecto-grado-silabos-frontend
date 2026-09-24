import forge from 'node-forge';

/**
 * I-139. Lee un certificado de firma `.p12`/`.pfx` en el navegador. El archivo y su clave
 * solo viven en memoria mientras se firma: nunca se envían ni se guardan.
 */
export type SignatureErrorCode =
  | 'invalid_file'
  | 'wrong_password'
  | 'no_key'
  | 'expired'
  | 'not_yet_valid'
  | 'unsupported_pdf'
  | 'too_large';

const messages: Record<SignatureErrorCode, string> = {
  invalid_file: 'El archivo no es un certificado de firma .p12 o .pfx válido.',
  wrong_password: 'La clave del certificado es incorrecta.',
  no_key: 'El certificado no contiene la llave para firmar. Use el archivo .p12 que le entregó la entidad emisora.',
  expired: 'El certificado de firma está vencido. Renueve su firma electrónica.',
  not_yet_valid: 'El certificado de firma todavía no es válido.',
  unsupported_pdf: 'El PDF no se puede firmar (está protegido o dañado). Vuelva a descargarlo.',
  too_large: 'La firma generada no cabe en el documento. Informe a soporte.',
};

export class SignatureError extends Error {
  constructor(readonly code: SignatureErrorCode, message = messages[code]) {
    super(message);
    this.name = 'SignatureError';
  }
}

export type SignerCertificate = {
  holder: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
};

const toBinary = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return binary;
};

const attribute = (subject: forge.pki.Certificate['subject'], name: string): string =>
  String(subject.getField(name)?.value ?? '').trim();

/** Abre el `.p12` con su clave y devuelve el certificado que corresponde a la llave. */
export function readCertificate(p12: Uint8Array, password: string, now: Date = new Date()): SignerCertificate {
  let asn1: forge.asn1.Asn1;
  try {
    asn1 = forge.asn1.fromDer(forge.util.createBuffer(toBinary(p12)), { strict: false });
  } catch {
    throw new SignatureError('invalid_file');
  }
  let store: forge.pkcs12.Pkcs12Pfx;
  try {
    store = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch (reason) {
    const text = reason instanceof Error ? reason.message : String(reason);
    throw new SignatureError(/invalid password|mac could not be verified|decrypt/i.test(text) ? 'wrong_password' : 'invalid_file');
  }

  // `@signpdf/signer-p12` usa la llave protegida (pkcs8ShroudedKeyBag), el formato de las CA.
  const keys = store.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  const key = keys[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!key) throw new SignatureError(keys.length === 0 && password === '' ? 'wrong_password' : 'no_key');
  const certificates = store.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const certificate = certificates
    .map((bag) => bag.cert)
    .find((cert): cert is forge.pki.Certificate => {
      const publicKey = cert?.publicKey as forge.pki.rsa.PublicKey | undefined;
      return Boolean(publicKey?.n && key.n.compareTo(publicKey.n) === 0 && key.e.compareTo(publicKey.e) === 0);
    });
  if (!certificate) throw new SignatureError('no_key');

  const { notBefore, notAfter } = certificate.validity;
  if (notAfter.getTime() < now.getTime()) throw new SignatureError('expired');
  if (notBefore.getTime() > now.getTime()) throw new SignatureError('not_yet_valid');

  const holder = attribute(certificate.subject, 'CN') || attribute(certificate.subject, 'O');
  if (!holder) throw new SignatureError('invalid_file', 'El certificado no identifica a su titular.');

  return {
    holder,
    issuer: attribute(certificate.issuer, 'CN') || attribute(certificate.issuer, 'O'),
    validFrom: notBefore,
    validTo: notAfter,
  };
}
