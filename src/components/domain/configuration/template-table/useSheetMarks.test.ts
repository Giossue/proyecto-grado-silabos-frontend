import { Editor } from '@tiptap/core';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref, shallowRef } from 'vue';
import { declareProjectData } from '@/api/template';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import { useSheetMarks } from '@/components/domain/configuration/template-table/useSheetMarks';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

vi.mock('@/api/template', () => ({ declareProjectData: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach((editor) => editor.destroy()); vi.mocked(declareProjectData).mockReset(); });

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

    it('en una lista, !Docente y @ProyectoCarrera se vuelven elementos de la lista', async () => {
        const list: DocumentNode = { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }] };
        const variable = { key: 'curricular_metodologia', label: 'Metodología', sample: 'Metodología', type: 'lista' as const };
        vi.mocked(declareProjectData).mockResolvedValue({ message: 'ok', variable });
        const { marks, inserted, declared } = setup(list);

        marks.insertTeacher('Metodología');
        await marks.insertProject('Metodología');
        await flushPromises();

        expect(inserted[0]).toMatchObject({ type: 'field', attrs: { listStyle: 'bullet' } });
        expect(declareProjectData).toHaveBeenCalledWith('plantilla-1', { label: 'Metodología', type: 'lista' });
        expect(inserted[1]).toEqual({ type: 'variable', attrs: { id: 'curricular_metodologia', label: 'Metodología', listStyle: 'bullet' } });
        expect(declared.value).toEqual([variable]);
    });
});
