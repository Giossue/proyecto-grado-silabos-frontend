import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { ref, shallowRef } from 'vue';
import type { TemplateVariable } from '@/lib/templateDocument';

type VariableSuggestionOptions = {
    variables: () => TemplateVariable[];
    /** Se consulta al escribir «@»: fuera de una celda no se abre la lista. */
    enabled?: () => boolean;
};

const normalize = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Autocompletado de datos automáticos: al escribir «@» se abre la lista y el
 * elegido entra como ficha con su nombre. La clave nunca se muestra.
 */
export function useVariableSuggestions(options: VariableSuggestionOptions) {
    const suggestions = shallowRef<SuggestionProps<TemplateVariable> | null>(
        null,
    );
    const selectedSuggestion = ref(0);
    const chooseVariable = (item: TemplateVariable) =>
        suggestions.value?.command(item);
    const suggestion: Omit<SuggestionOptions<TemplateVariable>, 'editor'> = {
        char: '@',
        allow: () => options.enabled?.() ?? true,
        items: ({ query }) =>
            options
                .variables()
                .filter((item) =>
                    normalize(item.label).includes(normalize(query)),
                )
                .slice(0, 8),
        command: ({ editor: target, range, props: item }) => {
            target
                .chain()
                .focus()
                .insertContentAt(range, [
                    {
                        type: 'variable',
                        attrs: { id: item.key, label: item.label },
                    },
                    { type: 'text', text: ' ' },
                ])
                .run();
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
                        (selectedSuggestion.value +
                            (event.key === 'ArrowDown' ? 1 : -1) +
                            list.length) %
                        Math.max(1, list.length);

                    return true;
                }

                if (event.key === 'Enter' && list.length) {
                    chooseVariable(list[selectedSuggestion.value]);

                    return true;
                }

                return false;
            },
        }),
    };

    return { suggestions, selectedSuggestion, chooseVariable, suggestion };
}
