import { api, apiBlob } from '@/api/client';
import type { StampPosition } from '@/lib/signature/signPdf';

export type SignatureRole = 'docente' | 'coordinacion';
export type SignatureState = 'sin_documento' | 'pendiente_docente' | 'pendiente_coordinacion' | 'firmado' | 'anulado';
export type SignatureStatus = {
  state: SignatureState;
  next_role: SignatureRole | null;
  my_role: SignatureRole | null;
  can_sign: boolean;
  artifact_id: string | null;
  document: { sha256: string; size: number } | null;
  stamp: StampPosition | null;
  signatures: Array<{ role: SignatureRole; signer: string; certificate_holder: string; certificate_issuer: string; signed_at: string }>;
};

export const getSignatureStatus = (revisionId: string) => api<SignatureStatus>(`/revisions/${revisionId}/signature`);
export const downloadSignaturePdf = (revisionId: string) => apiBlob(`/revisions/${revisionId}/signature/pdf`);
export const submitSignature = (revisionId: string, signedPdf: Blob, baseSha256: string) => {
  const body = new FormData();
  body.append('signed_pdf', signedPdf, 'silabo-firmado.pdf');
  body.append('base_sha256', baseSha256);
  return api<{ message: string; signature_id: string }>(`/revisions/${revisionId}/signature`, { method: 'POST', body });
};
