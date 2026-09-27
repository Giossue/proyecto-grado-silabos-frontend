import { describe, expect, it } from 'vitest';
import { useVariableSuggestions } from '@/composables/useVariableSuggestions';

describe('useVariableSuggestions', () => {
    it('incluye todos los datos automáticos y permite encontrarlos por nombre', () => {
        const variables = Array.from({ length: 15 }, (_, index) => ({
            key: `dato_${index}`,
            label: `Dato ${index}`,
            sample: `Valor ${index}`,
        }));
        variables.push({
            key: 'habilidad',
            label: 'Habilidad académica',
            sample: 'Ejemplo',
        });
        const { suggestion, selectedSuggestion } = useVariableSuggestions({
            variables: () => variables,
        });

        expect(suggestion.items?.({ query: '' } as never)).toHaveLength(16);
        expect(suggestion.items?.({ query: 'academica' } as never)).toEqual([
            {
                key: 'habilidad',
                label: 'Habilidad académica',
                sample: 'Ejemplo',
            },
        ]);

        const menu = suggestion.render?.();
        menu?.onStart?.({ items: variables } as never);
        expect(
            menu?.onKeyDown?.({
                event: new KeyboardEvent('keydown', { key: 'ArrowUp' }),
            } as never),
        ).toBe(true);
        expect(selectedSuggestion.value).toBe(variables.length - 1);
    });
});
