import { describe, expect, it } from 'vitest';
import { blockFromSource, sourceBlockKind, sourceFromBlock, sourceRows } from '@/lib/blocks/sources';
import type { BlockDefinition } from '@/lib/blocks/types';
import type { DocumentNode } from '@/lib/templateDocument';

const p = (text?: string): DocumentNode => ({ type: 'paragraph', ...(text ? { content: [{ type: 'text', text }] } : {}) });
const th = (text: string): DocumentNode => ({ type: 'tableHeader', content: [p(text)] });
const td = (text?: string): DocumentNode => ({ type: 'tableCell', content: [p(text)] });
const template: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [
    { type: 'tableRow', content: [th('Unidad'), th('Nombre'), th('Resultados')] },
    { type: 'tableRow', content: [td('Unidad 1'), td(), td()] },
    { type: 'tableRow', content: [td('Unidad 2'), td(), td()] },
] }] };
const units = { label: 'Unidades', props: {}, rules: [], layout: [], value: { units: { type: 'list', min: 2, max: 2, initial: 2, item: { type: 'object', fields: {
    nombre: { type: 'text', max: 100, multiline: false, from: { field: 'catalogo', column: 2 } },
    resultado: { type: 'text', max: 100, multiline: false, from: { field: 'catalogo', column: 3 } },
    semanas: { type: 'list', min: 0, max: 4, initial: 1, item: { type: 'object', fields: { contenidos: { type: 'text', max: 100, multiline: false } } } },
} } } } } as unknown as BlockDefinition;

describe('datos de Carrera dentro de un bloque', () => {
    it('la ficha escribe en la tabla del campo lo que Carrera llena dentro del bloque', () => {
        expect(sourceBlockKind('catalogo', { unidades: units })).toBe('unidades');
        const value = blockFromSource(units, 'catalogo', null) as { units: Array<Record<string, unknown>> };
        expect(value.units).toHaveLength(2);
        expect(value.units[0]).toEqual({ nombre: '', resultado: '', semanas: [{ contenidos: '' }] });

        value.units[1]!.nombre = 'Espacios vectoriales';
        value.units[1]!.resultado = 'Aplica bases';
        const saved = sourceFromBlock(units, 'catalogo', value, template, null);

        expect(sourceRows(saved)).toEqual([['Unidad 1', '', ''], ['Unidad 2', 'Espacios vectoriales', 'Aplica bases']]);
        expect((blockFromSource(units, 'catalogo', saved) as { units: Array<Record<string, unknown>> }).units[1]!.nombre).toBe('Espacios vectoriales');
    });
});
