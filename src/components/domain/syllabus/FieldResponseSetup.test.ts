import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import type { DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';

const wrappers: Array<ReturnType<typeof mount>> = [];
const cellOf = (type: 'tableCell' | 'tableHeader', content: DocumentNode[] = []): DocumentNode => ({ type, attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content }] });
const template = (slot: DocumentNode[] = []): DocumentNode => ({ type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Estrategias de la asignatura' }] },
    { type: 'paragraph', content: slot },
    { type: 'table', content: [
        { type: 'tableRow', content: [cellOf('tableHeader', [{ type: 'text', text: 'Técnica' }]), cellOf('tableHeader', [{ type: 'text', text: 'Horas' }])] },
        { type: 'tableRow', content: [cellOf('tableCell'), cellOf('tableCell')] },
    ] },
] });
const mountSetup = (source: DocumentNode, modelValue: DocumentNode | null = null, disabled = false) => {
    setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, {});
    const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Métodos', template: source, modelValue, setup: true, disabled }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const last = (wrapper: ReturnType<typeof mountSetup>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
const kinds = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
const choose = async (wrapper: ReturnType<typeof mountSetup>, slot: string, kind: string): Promise<void> => {
    if (!kinds().length) {
        await wrapper.get(`button[aria-label="${slot}"]`).trigger('click');
        await flushPromises();
    }
    kinds().find((button) => button.textContent?.trim() === kind)!.click();
    await flushPromises();
};
const option = async (index: number, value: string): Promise<void> => {
    const input = document.querySelector<HTMLInputElement>(`input[aria-label="Opción ${index}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await flushPromises();
};

describe('Armar tipos de respuesta en un campo del docente', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('cada espacio es un recuadro limpio y al hacer clic se elige el tipo y se escriben las opciones ahí mismo', async () => {
        const wrapper = mountSetup(template());
        expect(wrapper.find('textarea').exists()).toBe(false);
        expect(wrapper.find('[role="toolbar"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Estrategias de la asignatura');
        expect(wrapper.text()).toContain('Lo escribe el docente');
        expect(wrapper.findAll('button').some((button) => button.text() === 'Agregar fila')).toBe(false);

        await wrapper.get('button[aria-label="Técnica, fila 1: Texto libre"]').trigger('click');
        await flushPromises();
        expect(kinds().map((button) => button.textContent?.trim())).toEqual(['Texto libre', 'Número', 'Elegir una', 'Elegir varias']);
        expect(kinds()[0]!.getAttribute('aria-checked')).toBe('true');
        await choose(wrapper, 'Técnica, fila 1: Texto libre', 'Elegir una');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content).toEqual([{ type: 'response', attrs: { kind: 'una', options: [], value: null } }]);
        expect(last(wrapper).content![0]).toEqual(template().content![0]);

        await wrapper.setProps({ modelValue: last(wrapper) });
        await flushPromises();
        expect(wrapper.get('button[aria-label="Técnica, fila 1: Elegir una"]').text()).toBe('Elegir una · sin opciones');
        await option(1, 'Taller');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Taller' }], value: null });

        await wrapper.setProps({ modelValue: last(wrapper) });
        await flushPromises();
        expect(wrapper.get('button[aria-label="Técnica, fila 1: Elegir una"]').text()).toBe('Elegir una · 1 opción');
        await choose(wrapper, 'Técnica, fila 1: Elegir una', 'Elegir varias');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs).toEqual({ kind: 'varias', options: [{ const: 'o1', title: 'Taller' }], value: [] });

        await wrapper.setProps({ modelValue: last(wrapper) });
        await flushPromises();
        await choose(wrapper, 'Técnica, fila 1: Elegir varias', 'Texto libre');
        expect(last(wrapper)).toEqual(template());
    });

    it('un espacio suelto se vuelve número y un campo vacío completo también se arma', async () => {
        const wrapper = mountSetup(template());
        await choose(wrapper, 'Métodos: Texto libre', 'Número');
        expect(last(wrapper).content![1]!.content).toEqual([{ type: 'response', attrs: { kind: 'numero', options: [], value: '' } }]);
        await wrapper.setProps({ modelValue: last(wrapper) });
        await flushPromises();
        expect(document.querySelector('input[aria-label="Opción 1"]')).toBeNull();
        wrapper.unmount();
        wrappers.splice(0);
        document.body.innerHTML = '';

        const whole = mountSetup({ type: 'doc', content: [{ type: 'paragraph' }] });
        await flushPromises();
        expect(whole.find('[aria-label="Negrita"]').exists()).toBe(false);
        await choose(whole, 'Métodos: Texto libre', 'Elegir varias');
        expect(last(whole)).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'response', attrs: { kind: 'varias', options: [], value: [] } }] }] });
    });

    it('una respuesta que fijó Administración conserva su tipo y solo recibe las opciones que faltan', async () => {
        const pending = mountSetup(template([{ type: 'response', attrs: { kind: 'una', options: [], value: null } }]));
        expect(pending.text()).toContain('Elegir una (lo definió Administración)');
        expect(pending.find('button[aria-label="Métodos: Elegir una"]').exists()).toBe(false);
        await pending.get('input[aria-label="Opción 1"]').setValue('Presencial');
        expect(last(pending).content![1]!.content![0]!.attrs).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Presencial' }], value: null });

        const fixed = mountSetup(template([{ type: 'response', attrs: { kind: 'una', options: [{ const: 'o1', title: 'Virtual' }], value: null } }]));
        expect(fixed.text()).toContain('Virtual');
        expect(fixed.find('input[aria-label="Opción 1"]').exists()).toBe(false);
    });

    it('bloqueado no deja elegir espacios ni tipos', async () => {
        const wrapper = mountSetup(template(), null, true);
        expect(wrapper.get('button[aria-label="Técnica, fila 1: Texto libre"]').attributes('disabled')).toBeDefined();
        await wrapper.get('button[aria-label="Técnica, fila 1: Texto libre"]').trigger('click');
        await flushPromises();
        expect(kinds()).toHaveLength(0);
    });
});
