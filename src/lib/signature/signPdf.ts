import { P12Signer } from '@signpdf/signer-p12';
import { Buffer as BufferPolyfill } from 'buffer';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import { readCertificate, SignatureError, type SignerCertificate } from '@/lib/signature/certificate';
import { stampContent, STAMP_RESOURCES } from '@/lib/signature/stamp';

export const CONTENTS_HEX_LENGTH = 32768;
const BYTE_RANGE_PLACEHOLDER = '/ByteRange [0 ********** ********** **********]';

export type StampPosition = { page: number; x: number; y: number; width: number; height: number };

export type SignerRole = 'docente' | 'coordinacion' | 'biblioteca' | 'decanato';

const FALLBACK_WIDTH = 170;
const FALLBACK_HEIGHT = 48;
const FALLBACK_MARGIN = 30;

const ROLE_REASONS: Record<SignerRole, string> = {
  docente: 'Elaboración del sílabo',
  coordinacion: 'Aprobación de coordinación',
  biblioteca: 'Verificación de bibliografía (biblioteca)',
  decanato: 'Aprobación del decanato',
};

export const fallbackStamp = (role: SignerRole, page: number, pageWidth: number): StampPosition => ({
  page,
  x: role === 'docente'
    ? FALLBACK_MARGIN
    : role === 'coordinacion'
      ? (pageWidth - FALLBACK_WIDTH) / 2
      : pageWidth - FALLBACK_MARGIN - FALLBACK_WIDTH,
  y: 40,
  width: FALLBACK_WIDTH,
  height: FALLBACK_HEIGHT,
});

export type SignPdfInput = {
  pdf: Uint8Array;
  p12: Uint8Array;
  password: string;
  stamp: StampPosition | null;
  role: SignerRole;
  reason?: string;
  location?: string;
  now?: Date;
};

export type SignPdfResult = { pdf: Uint8Array; certificate: SignerCertificate };

const latin1 = (bytes: Uint8Array, start = 0, end = bytes.length): string => {
  let text = '';
  for (let index = start; index < end; index += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(index, Math.min(end, index + 0x8000)));
  }
  return text;
};

const ascii = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) bytes[index] = text.charCodeAt(index) & 0xff;
  return bytes;
};

const textString = (text: string): string => {
  let hex = 'FEFF';
  for (let index = 0; index < text.length; index++) hex += text.charCodeAt(index).toString(16).padStart(4, '0');
  return `<${hex.toUpperCase()}>`;
};

const pad = (value: number, size: number): string => String(value).padStart(size, '0');

const ecuadorParts = (date: Date): { stamp: string; pdf: string } => {
  const local = new Date(date.getTime() - 5 * 3600 * 1000);
  const y = local.getUTCFullYear();
  const [mo, d, h, mi, s] = [local.getUTCMonth() + 1, local.getUTCDate(), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()];
  return {
    stamp: `${y}-${pad(mo, 2)}-${pad(d, 2)}T${pad(h, 2)}:${pad(mi, 2)}:${pad(s, 2)}-05:00`,
    pdf: `D:${y}${pad(mo, 2)}${pad(d, 2)}${pad(h, 2)}${pad(mi, 2)}${pad(s, 2)}-05'00'`,
  };
};

const lastStartXref = (text: string): number => {
  const matches = [...text.slice(-4096).matchAll(/startxref\s+(\d+)/g)];
  const last = matches.at(-1);
  if (!last) throw new SignatureError('unsupported_pdf');
  return Number(last[1]);
};

const maxDeclaredSize = (text: string): number => {
  let size = 0;
  for (const match of text.matchAll(/\/Size\s+(\d+)/g)) size = Math.max(size, Number(match[1]));
  return size;
};

const fmt = (value: number): string => (Math.round(value * 100) / 100).toString();

type IndirectObject = { ref: PDFRef; body: string };

export async function signPdf(input: SignPdfInput): Promise<SignPdfResult> {
  const now = input.now ?? new Date();
  const certificate = readCertificate(input.p12, input.password, now);
  const original = input.pdf;
  const originalText = latin1(original);

  let document: PDFDocument;
  try {
    document = await PDFDocument.load(original, { updateMetadata: false, ignoreEncryption: false });
  } catch {
    throw new SignatureError('unsupported_pdf');
  }
  const { context } = document;
  const trailer = context.trailerInfo;
  if (trailer.Encrypt || !(trailer.Root instanceof PDFRef)) throw new SignatureError('unsupported_pdf');

  const pages = document.getPages();
  if (pages.length === 0) throw new SignatureError('unsupported_pdf');
  const fallbackPage = pages.length - 1;
  const position: StampPosition = input.stamp && input.stamp.page >= 0 && input.stamp.page < pages.length
    ? input.stamp
    : fallbackStamp(input.role, fallbackPage, pages[fallbackPage]!.getSize().width);
  const page = pages[position.page]!;
  const box = page.getMediaBox();

  const prev = lastStartXref(originalText);
  const previousIsStream = !originalText.slice(prev, prev + 4).startsWith('xref');
  let next = Math.max(context.largestObjectNumber + 1, maxDeclaredSize(originalText));
  const allocate = (): PDFRef => PDFRef.of(next++, 0);

  const signatureRef = allocate();
  const widgetRef = allocate();
  const appearanceRef = allocate();
  const objects: IndirectObject[] = [];

  const dates = ecuadorParts(now);
  const reason = input.reason ?? ROLE_REASONS[input.role];
  const location = input.location ?? '';
  const fieldName = `Firma ${input.role} ${now.getTime()}`;

  objects.push({
    ref: signatureRef,
    body: `<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached ${BYTE_RANGE_PLACEHOLDER} `
      + `/Contents <${'0'.repeat(CONTENTS_HEX_LENGTH)}> /M (${dates.pdf}) /Name ${textString(certificate.holder)} `
      + `/Reason ${textString(reason)} /Location ${textString(location)} >>`,
  });

  const x = box.x + position.x;
  const y = box.y + position.y;
  objects.push({
    ref: widgetRef,
    body: `<< /Type /Annot /Subtype /Widget /FT /Sig /T ${textString(fieldName)} /V ${signatureRef.toString()} `
      + `/F 132 /P ${page.ref.toString()} /Rect [${fmt(x)} ${fmt(y)} ${fmt(x + position.width)} ${fmt(y + position.height)}] `
      + `/AP << /N ${appearanceRef.toString()} >> >>`,
  });

  const content = stampContent({ holder: certificate.holder, reason, location, date: dates.stamp }, position.width, position.height);
  objects.push({
    ref: appearanceRef,
    body: `<< /Type /XObject /Subtype /Form /BBox [0 0 ${fmt(position.width)} ${fmt(position.height)}] `
      + `/Resources ${STAMP_RESOURCES} /Length ${content.length} >>\nstream\n${content}\nendstream`,
  });

  const pageDict = page.node.clone(context);
  const annots = context.lookup(page.node.get(PDFName.of('Annots')));
  const annotItems = annots instanceof PDFArray ? annots.asArray() : [];
  pageDict.set(PDFName.of('Annots'), context.obj([...annotItems, widgetRef]));
  objects.push({ ref: page.ref, body: pageDict.toString() });

  const catalogRef = trailer.Root;
  const catalog = context.lookup(catalogRef, PDFDict);
  const acroFormEntry = catalog.get(PDFName.of('AcroForm'));
  const existingForm = context.lookup(acroFormEntry);
  const form = existingForm instanceof PDFDict ? existingForm.clone(context) : context.obj({});
  const fields = context.lookup(form.get(PDFName.of('Fields')));
  form.set(PDFName.of('Fields'), context.obj([...(fields instanceof PDFArray ? fields.asArray() : []), widgetRef]));
  form.set(PDFName.of('SigFlags'), context.obj(3));
  if (acroFormEntry instanceof PDFRef) {
    objects.push({ ref: acroFormEntry, body: form.toString() });
  } else {
    const formRef = allocate();
    objects.push({ ref: formRef, body: form.toString() });
    const updatedCatalog = catalog.clone(context);
    updatedCatalog.set(PDFName.of('AcroForm'), formRef);
    objects.push({ ref: catalogRef, body: updatedCatalog.toString() });
  }

  const separator = originalText.endsWith('\n') || originalText.endsWith('\r') ? '' : '\n';
  let increment = separator;
  const offsets = new Map<number, { offset: number; generation: number }>();
  for (const object of objects) {
    offsets.set(object.ref.objectNumber, { offset: original.length + increment.length, generation: object.ref.generationNumber });
    increment += `${object.ref.objectNumber} ${object.ref.generationNumber} obj\n${object.body}\nendobj\n`;
  }

  const trailerEntries = [
    `/Root ${catalogRef.toString()}`,
    trailer.Info ? `/Info ${trailer.Info.toString()}` : '',
    trailer.ID ? `/ID ${trailer.ID.toString()}` : '',
    `/Prev ${prev}`,
  ].filter(Boolean).join(' ');

  const sections = (entries: Map<number, { offset: number; generation: number }>): Array<[number, number[]]> => {
    const numbers = [...entries.keys()].sort((a, b) => a - b);
    const groups: Array<[number, number[]]> = [];
    for (const objectNumber of numbers) {
      const last = groups.at(-1);
      if (last && last[0] + last[1].length === objectNumber) last[1].push(objectNumber);
      else groups.push([objectNumber, [objectNumber]]);
    }
    return groups;
  };

  const xrefOffset = original.length + increment.length;
  if (previousIsStream) {
    const xrefRef = allocate();
    offsets.set(xrefRef.objectNumber, { offset: xrefOffset, generation: 0 });
    const groups = sections(offsets);
    let data = '';
    for (const [, numbers] of groups) {
      for (const objectNumber of numbers) {
        const entry = offsets.get(objectNumber)!;
        data += `01${entry.offset.toString(16).padStart(8, '0')}${entry.generation.toString(16).padStart(4, '0')}`;
      }
    }
    data = `${data.toUpperCase()}>`;
    const index = groups.map(([start, numbers]) => `${start} ${numbers.length}`).join(' ');
    increment += `${xrefRef.objectNumber} 0 obj\n<< /Type /XRef /Size ${next} /W [1 4 2] /Index [${index}] ${trailerEntries} `
      + `/Filter /ASCIIHexDecode /Length ${data.length} >>\nstream\n${data}\nendstream\nendobj\n`;
  } else {
    increment += 'xref\n';
    for (const [start, numbers] of sections(offsets)) {
      increment += `${start} ${numbers.length}\n`;
      for (const objectNumber of numbers) {
        const entry = offsets.get(objectNumber)!;
        increment += `${pad(entry.offset, 10)} ${pad(entry.generation, 5)} n \n`;
      }
    }
    increment += `trailer\n<< /Size ${next} ${trailerEntries} >>\n`;
  }
  increment += `startxref\n${xrefOffset}\n%%EOF\n`;

  const contentsMarker = `/Contents <${'0'.repeat(CONTENTS_HEX_LENGTH)}>`;
  const contentsStart = original.length + increment.indexOf(contentsMarker) + '/Contents '.length;
  const contentsEnd = contentsStart + CONTENTS_HEX_LENGTH + 2;
  const total = original.length + increment.length;
  const range = `/ByteRange [0 ${contentsStart} ${contentsEnd} ${total - contentsEnd}]`;
  increment = increment.replace(BYTE_RANGE_PLACEHOLDER, range.padEnd(BYTE_RANGE_PLACEHOLDER.length, ' '));

  const signed = new Uint8Array(total);
  signed.set(original, 0);
  signed.set(ascii(increment), original.length);

  const NodeBuffer = (globalThis.Buffer ?? ((globalThis as { Buffer?: unknown }).Buffer = BufferPolyfill)) as typeof BufferPolyfill;
  const covered = NodeBuffer.concat([NodeBuffer.from(signed.subarray(0, contentsStart)), NodeBuffer.from(signed.subarray(contentsEnd))]);
  const signer = new P12Signer(NodeBuffer.from(input.p12), { passphrase: input.password });
  const der = await signer.sign(covered as unknown as Buffer, now);
  const hex = NodeBuffer.from(der).toString('hex').toUpperCase();
  if (hex.length > CONTENTS_HEX_LENGTH) throw new SignatureError('too_large');
  signed.set(ascii(hex.padEnd(CONTENTS_HEX_LENGTH, '0')), contentsStart + 1);

  return { pdf: signed, certificate };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
