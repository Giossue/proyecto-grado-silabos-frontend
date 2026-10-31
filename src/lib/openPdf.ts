import { ApiError } from '@/api/client';
import { downloadDocument, getDocuments } from '@/api/documents';

export const openRevisionPdf = async (revisionId: string): Promise<string | null> => {
  const tab = window.open('', '_blank');
  try {
    const { artifacts } = await getDocuments(revisionId);
    const latest = [...artifacts]
      .filter((artifact) => artifact.estado === 'completado' && artifact.files !== null)
      .sort((left, right) => new Date(right.requested_at).getTime() - new Date(left.requested_at).getTime())[0];
    if (!latest) {
      tab?.close();
      return 'El PDF aún no está listo.';
    }
    const url = URL.createObjectURL(await downloadDocument(latest.id));
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

    return null;
  } catch (reason) {
    tab?.close();

    return reason instanceof ApiError ? reason.message : 'No se pudo abrir el PDF.';
  }
};
