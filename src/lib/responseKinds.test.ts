import { describe, expect, it } from 'vitest';
import { RESPONSE_KINDS, emptyResponse, nextOptionKey, responseAnswered, responseAttrs, responseHasOptions, responseKindOptions, responseLabel, responseLines, responseNeedsOptions, responseSchema } from '@/lib/responseKinds';
import type { DocumentNode } from '@/lib/templateDocument';

const options = [{ const: 'o1', title: 'Presencial' }, { const: 'o2', title: 'En línea' }];
const node = (kind: string, value: unknown, list = options): DocumentNode => ({ type: 'response', attrs: { kind, options: list, value: value as never } });

describe('Catálogo de tipos de respuesta', () => {
    it('ofrece texto libre, número, elegir una y elegir varias, sin texto corto ni fecha', () => {
        expect(Object.keys(RESPONSE_KINDS)).toEqual(['texto', 'numero', 'una', 'varias']);
        expect(responseKindOptions.map((kind) => kind.label)).toEqual(['Texto libre', 'Número', 'Elegir una', 'Elegir varias']);
        expect(responseHasOptions('numero')).toBe(false);
        expect(responseHasOptions('una')).toBe(true);
        expect(responseHasOptions('varias')).toBe(true);
    });

    it('cada tipo usa el esquema de valores de los bloques', () => {
        expect(responseSchema('numero', [])).toMatchObject({ type: 'number', multipleOf: 0.01 });
        expect(responseSchema('una', options)).toMatchObject({ type: 'string', oneOf: options });
        expect(responseSchema('varias', options)).toMatchObject({ type: 'array', items: { type: 'string', oneOf: options } });
    });

    it('una respuesta nueva empieza sin contestar y avisa si le faltan opciones', () => {
        expect(emptyResponse('numero')).toEqual({ type: 'response', attrs: { kind: 'numero', options: [], value: '' } });
        expect(emptyResponse('texto')).toEqual({ type: 'response', attrs: { kind: 'texto', options: [], value: '' } });
        expect(emptyResponse('una', options).attrs).toEqual({ kind: 'una', options, value: null });
        expect(emptyResponse('varias').attrs).toEqual({ kind: 'varias', options: [], value: [] });
        expect(responseNeedsOptions(responseAttrs(emptyResponse('varias')))).toBe(true);
        expect(responseNeedsOptions(responseAttrs(emptyResponse('numero')))).toBe(false);
        expect(responseAnswered(responseAttrs(emptyResponse('una', options)))).toBe(false);
        expect(nextOptionKey(options)).toBe('o3');
        expect(nextOptionKey([])).toBe('o1');
    });

    it('lo contestado se lee como texto', () => {
        expect(responseLines(responseAttrs(node('numero', '12,5', [])))).toEqual(['12,5']);
        expect(responseLines(responseAttrs(node('una', 'o2')))).toEqual(['En línea']);
        expect(responseLines(responseAttrs(node('varias', ['o2', 'o1'])))).toEqual(['En línea', 'Presencial']);
        expect(responseLines(responseAttrs(node('una', null)))).toEqual([]);
        expect(responseLabel(responseAttrs(node('una', null)))).toBe('Elegir una: Presencial · En línea');
        expect(responseLabel(responseAttrs(node('numero', '', [])))).toBe('Número');
        expect(responseLabel(responseAttrs(node('varias', [], [])))).toBe('Elegir varias: sin opciones');
    });
});
