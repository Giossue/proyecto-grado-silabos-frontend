// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { signPdf } from '@/lib/signature/signPdf';

/**
 * I-139. Paso de firma de `scripts/signature-e2e.sh`: firma con el módulo del navegador
 * un PDF real y un `.p12` creado con OpenSSL. Solo corre cuando el script define las
 * variables; en `vitest run` normal se omite.
 */
const input = process.env.SIGN_E2E_INPUT;

describe.skipIf(!input)('firma de extremo a extremo (script)', () => {
  it('firma el PDF indicado', async () => {
    const stamp = process.env.SIGN_E2E_STAMP ? JSON.parse(process.env.SIGN_E2E_STAMP) : null;
    const result = await signPdf({
      pdf: new Uint8Array(readFileSync(input!)),
      p12: new Uint8Array(readFileSync(process.env.SIGN_E2E_P12!)),
      password: process.env.SIGN_E2E_PASSWORD ?? '',
      stamp,
      role: process.env.SIGN_E2E_ROLE === 'coordinacion' ? 'coordinacion' : 'docente',
    });
    writeFileSync(process.env.SIGN_E2E_OUTPUT!, result.pdf);
    expect(result.pdf.length).toBeGreaterThan(0);
  }, 60_000);
});
