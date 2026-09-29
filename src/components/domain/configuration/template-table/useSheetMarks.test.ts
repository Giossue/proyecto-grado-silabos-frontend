import { Editor } from '@tiptap/core';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref, shallowRef } from 'vue';
import { declareProjectData } from '@/api/template';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import type { TableRowRole } from '@/components/domain/configuration/template-table/types';
import { useSheetMarks } from '@/components/domain/configuration/template-table/useSheetMarks';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

vi.mock('@/api/template', () => ({ declareProjectData: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach((editor) => editor.destroy()); vi.mocked(declareProjectData).mockReset(); });

const setup = (content: DocumentNode, role: TableRowRole = 'fixed', inCell = false) => {
    const editor = new Editor({ extensions: templateTableExtensions(), content });
    editors.push(editor);
    editor.commands.focus('end');
    const inserted: DocumentNode[] = [];
    const declared = ref<TemplateVariable[]>([]);
    const marks = useSheetMarks({
        editor: shallowRef(editor) as never,
        props: { templateId: 'plantilla-1', sectionTitle: 'Metodología', partTitle: '', pending: false, document: content },
        selectedRowRole: ref(role),
        inCell: ref(inCell),
        repeatedColumns: ref([]),
        insertNode: (node) => inserted.push(node),
        keyFor: (label) => `campo_${label}`,
        declared,
    });

    return { marks, inserted, declared };
};
const paragraph = (text: string): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] });

describe('useSheetMarks', () => {
    it('!Docente toma su nombre del texto previo y, sin texto, de la sección', () => {
        const withText = setup(paragraph('Herramientas TIC: '));
        withText.marks.insertTeacher();
        expect(withText.inserted[0]).toMatchObject({ type: 'field', attrs: { label: 'Herramientas TIC', kind: 'texto_largo', listStyle: null } });

        const empty = setup(paragraph(''));
        empty.marks.insertYesNo();
        expect(empty.inserted[0]).toMatchObject({ type: 'field', attrs: { label: 'Metodología', kind: 'seleccion_unica', options: ['Sí', 'No'] } });
    });

    it('en una lista, !Docente y @ProyectoCarrera se vuelven elementos de la lista', async () => {
        const list: DocumentNode = { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }] };
        const variable = { key: 'curricular_metodologia', label: 'Metodología', sample: 'Metodología', type: 'lista' as const, scope: 'asignatura' as const };
        vi.mocked(declareProjectData).mockResolvedValue({ message: 'ok', variable });
        const { marks, inserted, declared } = setup(list);

        marks.insertTeacher();
        await marks.insertProject();
        await flushPromises();

        expect(inserted[0]).toMatchObject({ type: 'field', attrs: { listStyle: 'bullet' } });
        expect(declareProjectData).toHaveBeenCalledWith('plantilla-1', { label: 'Metodología', type: 'lista' });
        expect(inserted[1]).toEqual({ type: 'variable', attrs: { id: 'curricular_metodologia', label: 'Metodología', listStyle: 'bullet' } });
        expect(declared.value).toEqual([variable]);
    });

    it('en una fila que agrega el docente, !Docente es un dato de la fila y Sí o No no se permite', () => {
        const cell = (text: string) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] });
        const table: DocumentNode = { type: 'doc', content: [{ type: 'table', attrs: { repeatKey: 'filas' }, content: [
            { type: 'tableRow', attrs: { rowRole: 'record' }, content: [cell('Semana'), cell('')] },
        ] }] };
        const { marks, inserted } = setup(table, 'record', true);

        marks.insertTeacher();
        marks.insertYesNo();

        expect(inserted).toHaveLength(1);
        expect(inserted[0]).toMatchObject({ type: 'column', attrs: { label: 'Semana', kind: 'texto_largo' } });
    });
});
