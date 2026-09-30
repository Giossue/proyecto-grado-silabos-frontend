import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { signPdf } from '@/lib/signature/signPdf';

const input = process.env.SIGN_E2E_INPUT;

describe.skipIf(!input)('firma de extremo a extremo (script)', () => {
  it('firma el PDF indicado', async () => {
    const stamp = process.env.SIGN_E2E_STAMP ? JSON.parse(process.env.SIGN_E2E_STAMP) : null;
    const result = await signPdf({
      pdf: new Uint8Array(readFileSync(input!)),
      p12: new Uint8Array(readFileSync(process.env.SIGN_E2E_P12!)),
      password: process.env.SIGN_E2E_PASSWORD ?? '',
      stamp,
      role: process.env.SIGN_E2E_ROLE === 'coordinacion' || process.env.SIGN_E2E_ROLE === 'biblioteca' ? process.env.SIGN_E2E_ROLE : 'docente',
    });
    writeFileSync(process.env.SIGN_E2E_OUTPUT!, result.pdf);
    expect(result.pdf.length).toBeGreaterThan(0);
  }, 60_000);
});
