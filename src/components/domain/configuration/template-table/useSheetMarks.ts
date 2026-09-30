import type { Editor } from '@tiptap/vue-3';
import type { Ref, ShallowRef } from 'vue';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

type Source = {
    templateId: string;
    sectionTitle: string;
    partTitle?: string;
    pending: boolean;
    document: DocumentNode;
};

type Options = {
    editor: ShallowRef<Editor | undefined>;
    props: Source;
    insertNode: (node: DocumentNode) => void;
    keyFor: (label: string) => string;
    declared: Ref<TemplateVariable[]>;
};

export function useSheetMarks(options: Options) {
    const { editor } = options;

    const inList = (): boolean => {
        const { $from } = editor.value?.state.selection ?? {};
        for (let depth = $from?.depth ?? 0; depth > 0; depth--) {
            if ($from?.node(depth).type.name === 'listItem') {
                return true;
            }
        }

        return false;
    };
    const insertTeacher = (label: string): void => {
        options.insertNode({
            type: 'field',
            attrs: {
                key: options.keyFor(label), label, kind: 'texto_largo', choice: null,
                options: null,
                listStyle: inList() ? 'bullet' : null,
            },
        });
    };

    const insertYesNo = (label: string): void => {
        options.insertNode({
            type: 'field',
            attrs: {
                key: options.keyFor(label), label, kind: 'seleccion_unica', choice: null,
                options: ['Sí', 'No'], listStyle: null,
            },
        });
    };

    return { insertTeacher, insertYesNo };
}
