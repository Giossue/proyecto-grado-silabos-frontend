import type { MentionOptions } from '@tiptap/extension-mention';
import type { SuggestionProps } from '@tiptap/suggestion';
import { ref, shallowRef } from 'vue';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

type VariableSuggestionOptions = {
    variables: () => TemplateVariable[];
    allowTeacher: () => boolean;
    teacherNode: () => DocumentNode;
};

const normalize = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function useVariableSuggestions(options: VariableSuggestionOptions) {
    const suggestions = shallowRef<SuggestionProps<TemplateVariable> | null>(
        null,
    );
    const selectedSuggestion = ref(0);
    const chooseVariable = (item: TemplateVariable) =>
        suggestions.value?.command({ id: item.key, label: item.key });
    const suggestion: MentionOptions<TemplateVariable>['suggestion'] = {
        char: '@',
        items: ({ query }) =>
            [
                {
                    key: 'docente',
                    label: 'Campo que completará el docente',
                    sample: '',
                },
                ...options.variables(),
            ]
                .filter(
                    (item) => item.key !== 'docente' || options.allowTeacher(),
                )
                .filter((item) =>
                    normalize(`${item.key} ${item.label}`).includes(
                        normalize(query),
                    ),
                )
                .slice(0, 8),
        command: ({ editor: target, range, props: item }) => {
            if (item.id === 'docente') {
                target
                    .chain()
                    .focus()
                    .insertContentAt(range, options.teacherNode())
                    .setNodeSelection(range.from)
                    .run();

                return;
            }

            target
                .chain()
                .focus()
                .insertContentAt(range, [
                    {
                        type: 'variable',
                        attrs: { id: item.id, label: item.id },
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
