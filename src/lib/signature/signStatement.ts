import forge from 'node-forge';
import { readSigner, type SignerCertificate } from '@/lib/signature/certificate';

export type StatementSignature = { statement: string; cms: string };

export type SignStatementInput = {
  statement: string;
  p12: Uint8Array;
  password: string;
  now?: Date;
};

export type SignStatementResult = { signature: StatementSignature; certificate: SignerCertificate };

export function signStatement(input: SignStatementInput): SignStatementResult {
  const now = input.now ?? new Date();
  const signer = readSigner(input.p12, input.password, now);
  const message = forge.pkcs7.createSignedData();
  message.content = forge.util.createBuffer(forge.util.encodeUtf8(input.statement));
  message.addCertificate(signer.x509);
  for (const certificate of signer.chain) message.addCertificate(certificate);
  message.addSigner({
    key: signer.key,
    certificate: signer.x509,
    digestAlgorithm: forge.pki.oids.sha256!,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType!, value: forge.pki.oids.data! },
      { type: forge.pki.oids.messageDigest! },
      { type: forge.pki.oids.signingTime!, value: now.toISOString() },
    ],
  });
  message.sign({ detached: true });
  const der = forge.asn1.toDer(message.toAsn1()).getBytes();

  return {
    signature: { statement: input.statement, cms: forge.util.encode64(der) },
    certificate: signer.certificate,
  };
}
