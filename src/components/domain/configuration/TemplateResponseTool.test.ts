import { flushPromises, mount } from '@vue/test-utils';
import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import TemplateFieldContent from './TemplateFieldContent.vue';
import TemplateResponseTool from './TemplateResponseTool.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import type { TemplateField } from '@/api/template';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';

const wrappers: Array<ReturnType<typeof mount>> = [];
const cellDocument: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [
    { type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Modalidad' }] }] }] },
    { type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph' }] }] },
] }] };
const editorFor = async (content: DocumentNode) => {
    const host = mount(FreeTextEditor, { props: { id: 'campo', label: 'Campo', modelValue: content, toolbar: false }, attachTo: document.body });
    wrappers.push(host);
    await flushPromises();
    return { host, editor: (host.vm as unknown as { editor: Editor }).editor };
};
const mountTool = (editor: Editor | null, allowed = true) => {
    const wrapper = mount(TemplateResponseTool, { props: { editor, allowed }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const open = async (tool: ReturnType<typeof mountTool>): Promise<void> => {
    await tool.get('button[aria-label="Tipo de respuesta"]').trigger('click');
    await flushPromises();
};
const pick = async (label: string): Promise<void> => {
    [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find((item) => item.textContent?.trim() === label)!.click();
    await flushPromises();
};
const write = async (label: string, text: string): Promise<void> => {
    const input = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await flushPromises();
};
const press = async (selector: string): Promise<void> => {
    document.querySelector<HTMLButtonElement>(selector)!.click();
    await flushPromises();
};

describe('Tipo de respuesta en la cinta de la plantilla', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('convierte la celda donde está el cursor en una respuesta de elegir, con las opciones escritas ahí mismo', async () => {
        const { host, editor } = await editorFor(cellDocument);
        let cell = -1;
        editor.state.doc.descendants((node, position) => { if (node.type.name === 'tableCell') cell = position; });
        editor.commands.setTextSelection(cell + 2);
        const tool = mountTool(editor);

        await open(tool);
        expect([...document.querySelectorAll('[role="radio"]')].map((item) => item.textContent?.trim())).toEqual(['Texto libre', 'Elegir una', 'Elegir varias']);
        await pick('Elegir una');
        await write('Opción 1', '  Presencial ');
        await press('[data-response-add-option]');
        await write('Opción 2', 'En línea');
        await press('[data-response-insert]');

        const value = host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(nodesOfType(nodesOfType(value, 'tableCell')[0]!, 'response').map((node) => node.attrs)).toEqual([
            { kind: 'una', options: [{ const: 'o1', title: 'Presencial' }, { const: 'o2', title: 'En línea' }], value: null },
        ]);
    });

    it('un texto libre no pide opciones y un campo Institucional no admite tipos de respuesta', async () => {
        const { host, editor } = await editorFor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Horas: ' }] }] });
        const blocked = mountTool(editor, false);
        expect(blocked.get('button[aria-label="Tipo de respuesta"]').attributes('disabled')).toBeDefined();
        blocked.unmount();

        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const tool = mountTool(editor);
        await open(tool);
        await pick('Texto libre');
        expect(document.querySelector('input[aria-label="Opción 1"]')).toBeNull();
        await press('[data-response-insert]');

        const value = host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(value.content![0]!.content).toEqual([{ type: 'text', text: 'Horas: ' }, { type: 'response', attrs: { kind: 'texto', options: [], value: '' } }]);
    });

    it('la plantilla nombra el tipo mientras se edita y no lo imprime en la vista previa', () => {
        const field: TemplateField = { id: 'f1', key: 'modalidad', label: 'Modalidad', quien_llena: 'carrera', content: { type: 'doc', content: [
            { type: 'paragraph', content: [{ type: 'response', attrs: { kind: 'una', options: [{ const: 'o1', title: 'Presencial' }, { const: 'o2', title: 'En línea' }], value: null } }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Horas: ' }, { type: 'response', attrs: { kind: 'texto', options: [], value: '' } }] },
        ] } };
        const editing = mount(TemplateFieldContent, { props: { field } });
        expect(editing.get('[data-field-body]').text()).toContain('Elegir una: Presencial · En línea');
        expect(editing.get('[data-field-body]').text()).toContain('Texto libre');

        const preview = mount(TemplateFieldContent, { props: { field, preview: true } });
        expect(preview.get('[data-field-body]').text()).not.toContain('Elegir una');
        expect(preview.get('[data-field-body]').text()).toContain('Horas:');
    });
});
