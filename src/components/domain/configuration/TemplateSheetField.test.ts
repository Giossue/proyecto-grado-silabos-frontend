import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import type { TemplateField } from '@/api/template';
import TemplateFormatTools from '@/components/domain/configuration/TemplateFormatTools.vue';
import TemplateSheetField from '@/components/domain/configuration/TemplateSheetField.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import { nodesOfType, type DocumentNode, type TemplateVariable } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';

const official = definition as unknown as TemplateDefinitionPayload;
const variables: TemplateVariable[] = [
    { key: 'nombre_facultad', label: 'Nombre de la facultad', sample: 'Ciencias' },
    { key: 'nombre_asignatura', label: 'Nombre de la asignatura', sample: 'Calidad' },
];
const paragraph = (content: DocumentNode[]): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph', content }] });
const field = (content: DocumentNode, quien_llena: TemplateField['quien_llena'] = 'carrera'): TemplateField => ({ id: 'f1', key: 'f1', label: 'Asignatura', quien_llena, content } as TemplateField);
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountField = (content: DocumentNode, quien_llena: TemplateField['quien_llena'] = 'carrera') => {
    const wrapper = mount(TemplateSheetField, { props: { field: field(content, quien_llena), locked: false, variables }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const editorOf = (wrapper: ReturnType<typeof mount>): Editor => (wrapper.findComponent(FreeTextEditor).vm as unknown as { editor: Editor }).editor;
const lastField = (wrapper: ReturnType<typeof mount>): TemplateField => wrapper.emitted('update:field')!.at(-1)![0] as TemplateField;
const variableIds = (value: DocumentNode): unknown[] => nodesOfType(value, 'variable').map((node) => node.attrs?.id);

describe('datos del sistema en el editor de la plantilla', () => {
    beforeEach(() => {
        setTemplateRuntime(official, Object.fromEntries(variables.map((variable) => [variable.key, ''])));
        Object.defineProperty(Range.prototype, 'getClientRects', { value: () => Object.assign([], { item: () => null }), configurable: true });
        Object.defineProperty(Range.prototype, 'getBoundingClientRect', { value: () => new DOMRect(0, 0, 0, 0), configurable: true });
    });
    afterEach(() => {
        wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
        document.body.innerHTML = '';
        Reflect.deleteProperty(Range.prototype, 'getClientRects');
        Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
    });

    it('inserta un dato del sistema desde la cinta', async () => {
        const host = mountField(paragraph([{ type: 'text', text: 'Hola ' }]));
        await flushPromises();
        const editor = editorOf(host);
        editor.commands.focus('end');
        const ribbon = mount(TemplateFormatTools, { props: { editor, variables }, attachTo: document.body });
        wrappers.push(ribbon);
        await flushPromises();
        const trigger = document.body.querySelector<HTMLElement>('[aria-label="Insertar dato del sistema"]')!;
        expect(trigger).not.toBeNull();
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await flushPromises();
        const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) => element.textContent?.trim() === 'Nombre de la facultad')!;
        item.click();
        await flushPromises();
        expect(variableIds(lastField(host).content)).toEqual(['nombre_facultad']);
        expect(nodesOfType(lastField(host).content, 'variable')[0]!.attrs?.label).toBe('Nombre de la facultad');
    });

    it('inserta un dato del sistema escribiendo «/»', async () => {
        const host = mountField(paragraph([{ type: 'text', text: 'Hola' }]));
        await flushPromises();
        const editor = editorOf(host);
        editor.chain().focus('end').insertContent(' /asig').run();
        await flushPromises();
        const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')];
        expect(options.map((option) => option.textContent?.trim())).toEqual(['Nombre de la asignatura']);
        options[0]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await flushPromises();
        const value = lastField(host).content;
        expect(variableIds(value)).toEqual(['nombre_asignatura']);
        expect(nodesOfType(value, 'text').map((node) => node.text).join('')).not.toContain('/asig');
    });

    it('la ficha del campo muestra el nombre real del dato', async () => {
        mountField(paragraph([{ type: 'variable', attrs: { id: 'nombre_facultad', label: '' } }]));
        await flushPromises();
        const chip = document.body.querySelector('[data-field-body] .document-variable')!;
        expect(chip.textContent).toBe('Nombre de la facultad');
    });

    it('las celdas de la tabla de identificación muestran el nombre real del dato', async () => {
        mountField({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind: 'identificacion', props: {}, value: {} } }] }, 'institucional');
        await flushPromises();
        const chips = [...document.body.querySelectorAll('[data-block] .document-variable')].map((element) => element.textContent);
        expect(chips).toContain('Nombre de la facultad');
        expect(document.body.querySelector('[data-block]')!.textContent).not.toContain('Dato del sistema');
    });
});
