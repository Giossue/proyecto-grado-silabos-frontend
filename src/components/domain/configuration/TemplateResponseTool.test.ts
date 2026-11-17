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
const type = async (selector: string, text: string): Promise<void> => {
    const input = document.querySelector<HTMLInputElement>(selector)!;
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

    it('en «Más opciones» marca si es obligatoria, la ayuda y el límite de caracteres', async () => {
        const { host, editor } = await editorFor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Horario: ' }] }] });
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const tool = mountTool(editor);
        await open(tool);
        await pick('Texto libre');
        await press('[data-response-more]');
        await press('[data-response-required]');
        await type('[data-response-help]', 'Indique días y horas.');
        await type('[data-response-max-length]', '5000');
        expect(document.querySelector('[data-response-settings-error]')!.textContent).toContain('El límite de caracteres va de 1 a 3000.');
        expect(document.querySelector<HTMLButtonElement>('[data-response-insert]')!.disabled).toBe(true);
        await type('[data-response-max-length]', '500');
        await press('[data-response-insert]');

        const value = host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(JSON.parse(JSON.stringify(nodesOfType(value, 'response')[0]!.attrs))).toEqual({ kind: 'texto', options: [], value: '', required: false, help: 'Indique días y horas.', maxLength: 500 });
    });

    it('elegir una puede ir como desplegable', async () => {
        const { host, editor } = await editorFor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lugar: ' }] }] });
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const tool = mountTool(editor);
        await open(tool);
        await pick('Elegir una');
        await write('Opción 1', 'Aula');
        await press('[data-response-more]');
        await pick('Desplegable');
        await press('[data-response-insert]');
        const value = host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(JSON.parse(JSON.stringify(nodesOfType(value, 'response')[0]!.attrs))).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Aula' }], value: null, display: 'desplegable' });
    });

    it('elegir varias guarda cuántas elegir dentro del número de opciones', async () => {
        const { host, editor } = await editorFor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lugar: ' }] }] });
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const tool = mountTool(editor);
        await open(tool);
        await pick('Elegir varias');
        await write('Opción 1', 'Aula');
        await press('[data-response-add-option]');
        await write('Opción 2', 'Campo');
        await press('[data-response-more]');
        await type('[data-response-min]', '3');
        expect(document.querySelector('[data-response-settings-error]')!.textContent).toContain('Cuántas elegir va de 1 a 2, el número de opciones.');
        await type('[data-response-min]', '1');
        await type('[data-response-max]', '2');
        await press('[data-response-insert]');
        const value = host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(JSON.parse(JSON.stringify(nodesOfType(value, 'response')[0]!.attrs))).toEqual({ kind: 'varias', options: [{ const: 'o1', title: 'Aula' }, { const: 'o2', title: 'Campo' }], value: [], minChoices: 1, maxChoices: 2 });
    });

    it('en la plantilla, una respuesta de elegir recibe identificador y se muestra solo si otra anterior tiene la opción elegida', async () => {
        const question: DocumentNode = { type: 'response', attrs: { kind: 'una', options: [{ const: 'o1', title: 'Sí' }, { const: 'o2', title: 'No' }], value: null } };
        const { host, editor } = await editorFor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '¿Usa laboratorio? ' }, question, { type: 'text', text: ' Cuál: ' }] }] });
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
        const claimed: string[] = [];
        const other = { id: null, label: 'Campo anterior', options: [{ const: 'o1', title: 'Aula' }], field: 'f0', index: 0 };
        const tool = mount(TemplateResponseTool, { props: { editor, sources: [other], usedIds: ['r_usado'], claimSource: (source: { field: string }) => { claimed.push(source.field); return 'r_otro'; } }, attachTo: document.body });
        wrappers.push(tool);
        await open(tool);
        await pick('Elegir una');
        await write('Opción 1', 'Química');
        await press('[data-response-more]');
        expect(document.querySelector('[data-condition-hint]')!.textContent).toBe('Si queda oculta, se oculta toda su línea');
        Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => undefined, scrollIntoView: () => undefined });
        document.querySelector<HTMLElement>('[data-condition-source]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await flushPromises();
        expect([...document.querySelectorAll('[role="option"]')].map((item) => item.textContent?.trim())).toEqual(['Siempre', 'Campo anterior', 'Usa laboratorio']);
        document.querySelectorAll<HTMLElement>('[role="option"]')[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await flushPromises();
        expect(document.querySelector('[data-response-condition-error]')!.textContent).toContain('Elija al menos una opción');
        await press('[data-condition-option="o1"]');
        await press('[data-response-insert]');

        const responses = nodesOfType(host.emitted('update:modelValue')!.at(-1)![0] as DocumentNode, 'response').map((node) => JSON.parse(JSON.stringify(node.attrs)));
        const sourceId = responses[0].id as string;
        expect(sourceId).toMatch(/^r_[a-z0-9]+$/);
        expect(responses[1]).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Química' }], value: null, id: expect.stringMatching(/^r_[a-z0-9]+$/), showIf: { response: sourceId, options: ['o1'] } });
        expect(responses[1].id).not.toBe(sourceId);
        expect(claimed).toEqual([]);
    });
});
