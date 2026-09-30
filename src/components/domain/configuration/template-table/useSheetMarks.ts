import type { Editor } from '@tiptap/vue-3';
import type { Ref, ShallowRef } from 'vue';
import { declareProjectData } from '@/api/template';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';

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
    const { editor, props } = options;

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
                options: null, options_source: null, options_sources: [],
                listStyle: inList() ? 'bullet' : null,
            },
        });
    };

    const insertYesNo = (label: string): void => {
        options.insertNode({
            type: 'field',
            attrs: {
                key: options.keyFor(label), label, kind: 'seleccion_unica', choice: null,
                options: ['Sí', 'No'], options_source: null, options_sources: [], listStyle: null,
            },
        });
    };

    const insertProject = async (label: string): Promise<void> => {
        const list = inList();
        const position = editor.value?.state.selection.to;
        try {
            const { variable } = await declareProjectData(props.templateId, { label, type: list ? 'lista' : 'texto' });
            options.declared.value = [...options.declared.value.filter((item) => item.key !== variable.key), variable];
            if (position !== undefined) {
                editor.value?.commands.setTextSelection(position);
            }
            options.insertNode({
                type: 'variable',
                attrs: { id: variable.key, label: variable.label, listStyle: list ? 'bullet' : null },
            });
        } catch {
            toast.error('No se pudo agregar el dato del Proyecto de carrera. Intente de nuevo.');
        }
    };

    return { insertTeacher, insertYesNo, insertProject };
}
