import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { ref, shallowRef } from 'vue';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import { useSheetMarks } from '@/components/domain/configuration/template-table/useSheetMarks';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';


const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach((editor) => editor.destroy()); });

const setup = (content: DocumentNode) => {
    const editor = new Editor({ extensions: templateTableExtensions(), content });
    editors.push(editor);
    editor.commands.focus('end');
    const inserted: DocumentNode[] = [];
    const declared = ref<TemplateVariable[]>([]);
    const marks = useSheetMarks({
        editor: shallowRef(editor) as never,
        props: { templateId: 'plantilla-1', sectionTitle: 'Metodología', partTitle: '', pending: false, document: content },
        insertNode: (node) => inserted.push(node),
        keyFor: (label) => `campo_${label}`,
        declared,
    });

    return { marks, inserted, declared };
};
const paragraph = (text: string): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] });

describe('useSheetMarks', () => {
    it('usa el nombre que escribe el administrador, no el texto de la celda', () => {
        const withText = setup(paragraph('Herramientas TIC: '));
        withText.marks.insertTeacher('Herramientas pedagógicas');
        expect(withText.inserted[0]).toMatchObject({ type: 'field', attrs: { label: 'Herramientas pedagógicas', key: 'campo_Herramientas pedagógicas', kind: 'texto_largo', listStyle: null } });

        const yesNo = setup(paragraph(''));
        yesNo.marks.insertYesNo('Estudiantes con discapacidad');
        expect(yesNo.inserted[0]).toMatchObject({ type: 'field', attrs: { label: 'Estudiantes con discapacidad', kind: 'seleccion_unica', options: ['Sí', 'No'] } });
    });

    it('en una lista, !Docente se vuelve un elemento de la lista', () => {
        const list: DocumentNode = { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }] };
        const { marks, inserted } = setup(list);

        marks.insertTeacher('Metodología');

        expect(inserted[0]).toMatchObject({ type: 'field', attrs: { listStyle: 'bullet' } });
    });
});
