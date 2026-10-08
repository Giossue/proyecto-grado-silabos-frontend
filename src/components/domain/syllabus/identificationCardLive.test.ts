import { describe, expect, it } from 'vitest';
import { freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import { withDisability } from '@/components/domain/syllabus/identificationCardLive';
import type { DocumentNode } from '@/lib/templateDocument';

const cell = (text: string): DocumentNode => ({ type: 'tableCell', content: [{ type: 'paragraph', content: text === '' ? [] : [{ type: 'text', text, marks: [{ type: 'bold' }] }] }] });
const row = (...texts: string[]): DocumentNode => ({ type: 'tableRow', content: texts.map(cell) });
const card: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [
  row('ESTUDIANTES CON DISCAPACIDAD', 'Sí', '', 'Tipo de discapacidad:'),
  row('Breve descripción:'),
  row('No', 'X', ''),
] }] };
const rows = (document: DocumentNode): string[][] => (document.content![0]!.content ?? []).map((item) => (item.content ?? []).map((node) => freeTextPlain(node).trim()));

describe('withDisability', () => {
  it('marca Sí y escribe el tipo y la descripción mientras el docente escribe', () => {
    const result = rows(withDisability(card, { has: true, type: 'Visual', description: 'Baja visión' }));

    expect(result[0]).toEqual(['ESTUDIANTES CON DISCAPACIDAD', 'Sí', 'X', 'Tipo de discapacidad: Visual']);
    expect(result[1]).toEqual(['Breve descripción: Baja visión']);
    expect(result[2]).toEqual(['No', '', '']);
  });

  it('con No deja la X en No y vacía el tipo y la descripción', () => {
    const result = rows(withDisability(card, { has: false, type: 'Visual', description: 'Baja visión' }));

    expect(result[0]).toEqual(['ESTUDIANTES CON DISCAPACIDAD', 'Sí', '', 'Tipo de discapacidad:']);
    expect(result[2]).toEqual(['No', 'X', '']);
  });
});
