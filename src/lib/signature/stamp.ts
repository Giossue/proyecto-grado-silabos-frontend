import QRCode from 'qrcode';

export type StampText = {
  holder: string;
  reason: string;
  location: string;
  date: string;
};

const VALIDATE_URL = 'https://www.firmadigital.gob.ec';

export const stampQrText = ({ holder, reason, location, date }: StampText): string => [
  `FIRMADO POR: ${holder}`,
  `RAZON: ${reason}`,
  `LOCALIZACION: ${location}`,
  `FECHA: ${date}`,
  `VALIDAR CON: ${VALIDATE_URL}`,
].join('\n');

const number = (value: number): string => {
  const fixed = value.toFixed(3);
  return fixed.replace(/\.?0+$/, '') || '0';
};

export const winAnsiHex = (text: string): string => {
  let hex = '';
  for (const char of text.normalize('NFC')) {
    const code = char.codePointAt(0) ?? 63;
    hex += (code >= 32 && code <= 255 && !(code >= 127 && code < 160) ? code : 63).toString(16).padStart(2, '0');
  }
  return `<${hex.toUpperCase()}>`;
};

const wrap = (text: string, perLine: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= perLine) line += ` ${word}`;
    else { lines.push(line); line = word; }
    while (line.length > perLine) { lines.push(line.slice(0, perLine)); line = line.slice(perLine); }
  }
  if (line) lines.push(line);
  return lines;
};

const COURIER_WIDTH = 0.6;

export function stampContent(text: StampText, width: number, height: number): string {
  const ops: string[] = [];
  const qr = QRCode.create(stampQrText(text), { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const side = Math.min(height - 4, width * 0.3);
  const cell = side / size;
  const originY = (height - side) / 2;
  const rects: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        rects.push(`${number(2 + col * cell)} ${number(originY + side - (row + 1) * cell)} ${number(cell)} ${number(cell)} re`);
      }
    }
  }
  ops.push('q', '0 0 0 rg', ...rects, 'f', 'Q');

  const textX = 2 + side + 6;
  const available = width - textX - 2;
  const small = Math.min(6, available / (30 * COURIER_WIDTH));
  let nameSize = Math.min(8, available / (18 * COURIER_WIDTH));
  let lines = wrap(text.holder.toUpperCase(), Math.floor(available / (nameSize * COURIER_WIDTH)));
  while (lines.length > 3 && nameSize > 4) {
    nameSize -= 0.5;
    lines = wrap(text.holder.toUpperCase(), Math.floor(available / (nameSize * COURIER_WIDTH)));
  }
  let y = height - 4 - small;
  const line = (font: string, fontSize: number, value: string): void => {
    ops.push(`BT /${font} ${number(fontSize)} Tf 0 0 0 rg ${number(textX)} ${number(y)} Td ${winAnsiHex(value)} Tj ET`);
  };
  line('F1', small, 'Validar únicamente en FirmaEC.');
  y -= small + 2;
  line('F1', small, 'Firmado electrónicamente por:');
  y -= nameSize + 2;
  for (const value of lines.slice(0, 4)) {
    line('F2', nameSize, value);
    y -= nameSize + 1;
  }

  return ops.join('\n');
}

export const STAMP_RESOURCES = '<< /Font << '
  + '/F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >> '
  + '/F2 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >> '
  + '>> /ProcSet [/PDF /Text] >>';
