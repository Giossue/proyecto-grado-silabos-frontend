import { describe, expect, it } from 'vitest';
import { hiddenKeys } from '@/lib/fieldConditions';

describe('fieldConditions', () => {
    const fields = (value: unknown) => [
        { key: 'tiene', type: 'seleccion_unica', value, options: [] },
        { key: 'tipo', type: 'texto_corto', value: 'Visual', show_when: { key: 'tiene', value: 'Sí' } },
        { key: 'libre', type: 'texto_corto', value: '' },
    ];

    it('oculta la parte mientras la condición no se cumple', () => {
        expect([...hiddenKeys(fields('No'))]).toEqual(['tipo']);
        expect([...hiddenKeys(fields(null))]).toEqual(['tipo']);
        expect([...hiddenKeys(fields('Sí'))]).toEqual([]);
    });

    it('compara Sí/No y no oculta si la parte referida ya no existe', () => {
        expect(
            hiddenKeys([
                { key: 'b', type: 'booleano', value: true },
                { key: 'x', show_when: { key: 'b', value: 'true' } },
                { key: 'y', show_when: { key: 'borrada', value: 'Sí' } },
            ]).size,
        ).toBe(0);
    });
});
