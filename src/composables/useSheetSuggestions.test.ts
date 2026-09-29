import { describe, expect, it, vi } from 'vitest';
import { useSheetSuggestions } from '@/composables/useSheetSuggestions';

describe('useSheetSuggestions', () => {
    it('busca por nombre sin tildes y conserva la entrada «Nuevo…»', () => {
        const items = [
            ...Array.from({ length: 15 }, (_, index) => ({ key: `dato_${index}`, label: `Dato ${index}`, node: { type: 'variable' } })),
            { key: 'habilidad', label: 'Habilidad académica', node: { type: 'variable' } },
            { key: 'pregunta', label: 'Formación', open: vi.fn() },
            { key: 'nuevo', label: 'Nuevo dato…', open: vi.fn(), always: true },
        ];
        const { suggestion, selectedSuggestion } = useSheetSuggestions({ char: '@', items: () => items });

        expect(suggestion.char).toBe('@');
        expect(suggestion.items?.({ query: '' } as never)).toHaveLength(18);
        const found = suggestion.items?.({ query: 'academica' } as never) as { key: string }[];
        expect(found.map((item) => item.key)).toEqual(['habilidad', 'nuevo']);

        const menu = suggestion.render?.();
        menu?.onStart?.({ items } as never);
        expect(menu?.onKeyDown?.({ event: new KeyboardEvent('keydown', { key: 'ArrowUp' }) } as never)).toBe(true);
        expect(selectedSuggestion.value).toBe(items.length - 1);
    });

    it('«Nuevo…» borra lo escrito y abre su diálogo', () => {
        const open = vi.fn();
        const run = vi.fn();
        const chain = { focus: () => chain, deleteRange: vi.fn(() => chain), insertContentAt: vi.fn(() => chain), run };
        const { suggestion } = useSheetSuggestions({ char: '!', items: () => [] });

        suggestion.command?.({ editor: { chain: () => chain }, range: { from: 1, to: 3 }, props: { key: 'nuevo', label: 'Nueva pregunta…', open } } as never);

        expect(chain.deleteRange).toHaveBeenCalledWith({ from: 1, to: 3 });
        expect(open).toHaveBeenCalled();
    });
});
