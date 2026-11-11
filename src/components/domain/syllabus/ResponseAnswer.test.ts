import { flushPromises, mount } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import ResponseAnswer from '@/components/domain/syllabus/ResponseAnswer.vue';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import { responseEmpty } from '@/lib/fieldResponses';
import type { ResponseAttrs } from '@/lib/responseKinds';
import type { DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';

const wrappers: Array<ReturnType<typeof mount>> = [];
const mounted = <T extends ReturnType<typeof mount>>(wrapper: T): T => { wrappers.push(wrapper); return wrapper; };
const options = [{ const: 'o1', title: 'Clase magistral' }, { const: 'o2', title: 'Taller' }, { const: 'o3', title: 'Seminario' }];
const answer = (attrs: ResponseAttrs, disabled = false) => mounted(mount(ResponseAnswer, { props: { attrs, label: 'Técnica', disabled }, attachTo: document.body }));
const response = (kind: string, value: unknown, list = options): DocumentNode => ({ type: 'response', attrs: { kind, options: kind === 'numero' ? [] : list, value: value as never } });
const cellOf = (type: 'tableCell' | 'tableHeader', content: DocumentNode[]): DocumentNode => ({ type, attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content }] });
const template: DocumentNode = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Horas de tutoría: ' }, response('numero', '')] },
    { type: 'table', content: [
        { type: 'tableRow', content: [cellOf('tableHeader', [{ type: 'text', text: 'Técnica' }]), cellOf('tableHeader', [{ type: 'text', text: 'Detalle' }])] },
        { type: 'tableRow', content: [cellOf('tableCell', [response('una', null)]), cellOf('tableCell', [])] },
    ] },
] };
const emittedValue = (wrapper: ReturnType<typeof mount>): unknown => wrapper.emitted('update:value')!.at(-1)![0];
const chooseOption = async (index: number): Promise<void> => {
    document.querySelectorAll<HTMLElement>('[role="option"]')[index]!.click();
    await flushPromises();
};

const scrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Element.prototype.scrollIntoView = scrollIntoView; });

describe('Responder un tipo de respuesta', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('un texto libre se escribe en un cuadro, con saltos de línea', async () => {
        const wrapper = answer({ kind: 'texto', options: [], value: '' });
        expect(wrapper.find('input').exists()).toBe(false);
        await wrapper.get('textarea[aria-label="Técnica"]').setValue('Primera línea\nSegunda línea');
        expect(emittedValue(wrapper)).toBe('Primera línea\nSegunda línea');
    });

    it('un número solo admite un número', async () => {
        const wrapper = answer({ kind: 'numero', options: [], value: '' });
        const input = wrapper.get('input[aria-label="Técnica"]');
        expect(input.attributes('inputmode')).toBe('decimal');
        const typed = (data: string): boolean => !input.element.dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true }));
        expect(typed('a')).toBe(true);
        expect(typed('7')).toBe(false);
        await input.setValue('12,5 horas');
        expect(emittedValue(wrapper)).toBe('12,5');
    });

    it('elegir una marca una sola opción, queda fija y solo se quita', async () => {
        const wrapper = answer({ kind: 'una', options, value: 'o1' });
        expect(wrapper.find('input').exists()).toBe(false);
        expect(wrapper.find('textarea').exists()).toBe(false);
        expect(wrapper.get('[data-response-chosen]').text()).toContain('Clase magistral');

        await wrapper.get('button[aria-label="Elegir en Técnica"]').trigger('click');
        await flushPromises();
        expect(document.querySelector('[role="dialog"] input, [role="dialog"] textarea')).toBeNull();
        expect([...document.querySelectorAll('[role="option"]')].map((item) => item.textContent?.trim())).toEqual(['Clase magistral', 'Taller', 'Seminario']);
        await chooseOption(2);
        expect(emittedValue(wrapper)).toBe('o3');

        await wrapper.get('button[aria-label="Quitar «Clase magistral»"]').trigger('click');
        expect(emittedValue(wrapper)).toBeNull();
    });

    it('elegir varias marca una o más opciones y cada una se quita por separado', async () => {
        const wrapper = answer({ kind: 'varias', options, value: ['o2'] });
        await wrapper.get('button[aria-label="Elegir en Técnica"]').trigger('click');
        await flushPromises();
        await chooseOption(0);
        expect(emittedValue(wrapper)).toEqual(['o2', 'o1']);
        await wrapper.setProps({ attrs: { kind: 'varias', options, value: ['o2', 'o1'] } });
        expect(wrapper.findAll('[data-response-chosen]').map((chip) => chip.text())).toEqual(['Taller', 'Clase magistral']);
        await wrapper.get('button[aria-label="Quitar «Taller»"]').trigger('click');
        expect(emittedValue(wrapper)).toEqual(['o1']);
    });

    it('sin opciones escritas pide que el coordinador las escriba', () => {
        const wrapper = answer({ kind: 'una', options: [], value: null });
        expect(wrapper.text()).toContain('No hay opciones para elegir: pídalas al coordinador');
        expect(wrapper.get('button[aria-label="Elegir en Técnica"]').attributes('disabled')).toBeDefined();
    });

    it('bloqueada no deja elegir ni quitar', () => {
        const wrapper = answer({ kind: 'varias', options, value: ['o1'] }, true);
        expect(wrapper.get('button[aria-label="Elegir en Técnica"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('button[aria-label="Quitar «Clase magistral»"]').attributes('disabled')).toBeDefined();
    });
});

describe('El editor del docente con tipos de respuesta', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('responde en el párrafo y en la celda sin poder escribir sobre la respuesta', async () => {
        setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, {});
        const wrapper = mounted(mount(FieldResponseEditor, { props: { id: 'campo', label: 'Estrategias', template, modelValue: null }, attachTo: document.body }));
        expect(wrapper.text()).toContain('Horas de tutoría:');
        expect(wrapper.findAll('textarea')).toHaveLength(1);

        await wrapper.get('input[inputmode="decimal"]').setValue('8');
        let value = wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(value.content![0]!.content![1]!.attrs!.value).toBe('8');
        await wrapper.setProps({ modelValue: value });

        await wrapper.get('button[aria-label="Elegir en Técnica, fila 1"]').trigger('click');
        await flushPromises();
        await chooseOption(1);
        value = wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(value.content![1]!.content![1]!.content![0]!.content![0]!.content![0]).toEqual(response('una', 'o2'));
        expect(value.content![0]!.content![1]!.attrs!.value).toBe('8');
        expect(responseEmpty(template, value)).toBe(false);
        expect(responseEmpty(template, template)).toBe(true);
    });

    it('una tabla con respuestas sigue creciendo por filas y cada fila nueva llega sin contestar', async () => {
        setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, {});
        const answered: DocumentNode = JSON.parse(JSON.stringify(template));
        answered.content![1]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs!.value = 'o1';
        const wrapper = mounted(mount(FieldResponseEditor, { props: { id: 'campo', label: 'Estrategias', template, modelValue: answered }, attachTo: document.body }));

        await wrapper.findAll('button').find((button) => button.text() === 'Agregar fila')!.trigger('click');
        const value = wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(value.content![1]!.content).toHaveLength(3);
        expect(value.content![1]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs!.value).toBe('o1');
        expect(value.content![1]!.content![2]!.content![0]!.content![0]!.content![0]).toEqual(response('una', null));
    });
});
