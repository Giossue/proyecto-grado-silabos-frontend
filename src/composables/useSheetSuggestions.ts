import { PluginKey } from '@tiptap/pm/state';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { ref, shallowRef } from 'vue';
import type { DocumentNode } from '@/lib/templateDocument';

/** Elemento del atajo: inserta su ficha o, si es «Nuevo…», abre su diálogo. */
export type SheetSuggestionItem = {
    key: string;
    label: string;
    node?: DocumentNode;
    open?: () => void;
};

type SheetSuggestionOptions = {
    /** «{» datos automáticos, «!» docente, «@» Proyecto de carrera (I-155). */
    char: string;
    items: () => SheetSuggestionItem[];
    enabled?: () => boolean;
};

export const normalizeSearch = (value: string): string =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Autocompletado de la hoja: al escribir el carácter se abre la lista y lo elegido
 * entra como ficha con su nombre. La clave nunca se muestra.
 */
export function useSheetSuggestions(options: SheetSuggestionOptions) {
    const suggestions = shallowRef<SuggestionProps<SheetSuggestionItem> | null>(null);
    const selectedSuggestion = ref(0);
    const choose = (item: SheetSuggestionItem) => suggestions.value?.command(item);
    const suggestion: Omit<SuggestionOptions<SheetSuggestionItem>, 'editor'> = {
        char: options.char,
        pluginKey: new PluginKey(`sheetSuggestion${options.char}`),
        allow: () => options.enabled?.() ?? true,
        items: ({ query }) =>
            options.items().filter((item) => item.open || normalizeSearch(item.label).includes(normalizeSearch(query))),
        command: ({ editor: target, range, props: item }) => {
            if (item.node) {
                target.chain().focus().insertContentAt(range, [item.node, { type: 'text', text: ' ' }]).run();

                return;
            }
            target.chain().focus().deleteRange(range).run();
            item.open?.();
        },
        render: () => ({
            onStart: (value) => {
                suggestions.value = value;
                selectedSuggestion.value = 0;
            },
            onUpdate: (value) => {
                suggestions.value = value;
                selectedSuggestion.value = 0;
            },
            onExit: () => {
                suggestions.value = null;
            },
            onKeyDown: ({ event }) => {
                const list = suggestions.value?.items ?? [];

                if (event.key === 'Escape') {
                    suggestions.value = null;

                    return true;
                }

                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    selectedSuggestion.value =
                        (selectedSuggestion.value + (event.key === 'ArrowDown' ? 1 : -1) + list.length) %
                        Math.max(1, list.length);

                    return true;
                }

                if (event.key === 'Enter' && list.length) {
                    choose(list[selectedSuggestion.value]);

                    return true;
                }

                return false;
            },
        }),
    };

    return { suggestions, selectedSuggestion, choose, suggestion };
}
