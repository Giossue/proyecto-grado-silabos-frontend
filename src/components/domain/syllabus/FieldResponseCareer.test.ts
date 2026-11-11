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
    const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Métodos', template: source, modelValue, career: true, disabled }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const last = (wrapper: ReturnType<typeof mountSetup>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
const kinds = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
const openSpace = async (wrapper: ReturnType<typeof mountSetup>, index: number): Promise<void> => {
    await wrapper.findAll('button[aria-label="Espacio para el docente"]')[index]!.trigger('click');
    await flushPromises();
};
const pick = async (kind: string): Promise<void> => {
    kinds().find((button) => button.textContent?.trim() === kind)!.click();
    await flushPromises();
};
const insert = async (): Promise<void> => {
    document.querySelector<HTMLButtonElement>('[data-response-insert]')!.click();
    await flushPromises();
};
const option = async (index: number, value: string): Promise<void> => {
    const input = document.querySelector<HTMLInputElement>(`input[aria-label="Opción ${index}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await flushPromises();
};

describe('El coordinador escribe un campo Carrera y deja espacios para el docente', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('en un espacio escribe texto que le llega fijo al docente', async () => {
        const wrapper = mountSetup(template());
        expect(wrapper.text()).toContain('Estrategias de la asignatura');
        await wrapper.findAll('textarea')[0]!.setValue('Clases activas');
        expect(last(wrapper).content![1]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Clases activas' }] });
        expect(last(wrapper).content![0]).toEqual(template().content![0]);
    });

    it('con el botón de la cinta convierte una celda en un espacio de elegir con sus opciones y lo puede quitar', async () => {
        const wrapper = mountSetup(template());
        expect(wrapper.findAll('button[aria-label="Espacio para el docente"]')).toHaveLength(3);
        await openSpace(wrapper, 1);
        expect(kinds().map((button) => button.textContent?.trim())).toEqual(['Texto libre', 'Elegir una', 'Elegir varias']);
        await pick('Elegir una');
        expect(document.querySelector<HTMLButtonElement>('[data-response-insert]')!.disabled).toBe(true);
        await option(1, 'Taller');
        await insert();
        const cell = last(wrapper).content![2]!.content![1]!.content![0]!;
        expect(cell.content![0]!.content).toEqual([{ type: 'response', attrs: { kind: 'una', options: [{ const: 'o1', title: 'Taller' }], value: null } }]);

        await wrapper.setProps({ modelValue: last(wrapper) });
        await flushPromises();
        expect(wrapper.text()).toContain('Espacio para el docente: Elegir una');
        await wrapper.get('button[aria-label="Quitar el espacio de Técnica, fila 1"]').trigger('click');
        expect(last(wrapper)).toEqual(template());
    });

    it('deja un espacio de texto libre en un párrafo', async () => {
        const wrapper = mountSetup(template());
        await openSpace(wrapper, 0);
        await pick('Texto libre');
        await insert();
        expect(last(wrapper).content![1]!.content).toEqual([{ type: 'response', attrs: { kind: 'texto', options: [], value: '' } }]);
    });

    it('un campo vacío completo se escribe con el editor de texto y su cinta trae el botón de espacios', async () => {
        const whole = mountSetup({ type: 'doc', content: [{ type: 'paragraph' }] });
        await flushPromises();
        expect(whole.find('[aria-label="Negrita"]').exists()).toBe(true);
        expect(whole.find('[role="toolbar"] button[aria-label="Espacio para el docente"]').exists()).toBe(true);
    });

    it('una respuesta que fijó Administración conserva su tipo y solo recibe las opciones que faltan', async () => {
        const pending = mountSetup(template([{ type: 'response', attrs: { kind: 'una', options: [], value: null } }]));
        expect(pending.text()).toContain('Elegir una (lo definió Administración)');
        await pending.get('input[aria-label="Opción 1"]').setValue('Presencial');
        expect(last(pending).content![1]!.content![0]!.attrs).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Presencial' }], value: null });
    });

    it('bloqueado no deja escribir ni poner espacios', () => {
        const wrapper = mountSetup(template(), null, true);
        expect(wrapper.findAll('button[aria-label="Espacio para el docente"]').every((button) => button.attributes('disabled') !== undefined)).toBe(true);
        expect(wrapper.findAll('textarea').every((area) => area.attributes('disabled') !== undefined)).toBe(true);
    });
});

describe('El docente llena solo los espacios de un campo Carrera', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('lo que respondió el coordinador sale fijo y el texto libre se escribe en un cuadro', async () => {
        setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, {});
        const source: DocumentNode = { type: 'doc', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Modalidad: ' }, { type: 'response', attrs: { kind: 'una', options: [{ const: 'o1', title: 'Presencial' }], value: 'o1' } }] },
            { type: 'paragraph', content: [{ type: 'response', attrs: { kind: 'texto', options: [], value: '' } }] },
        ] };
        const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Métodos', template: source, modelValue: source }, attachTo: document.body });
        wrappers.push(wrapper);
        expect(wrapper.text()).toContain('Presencial');
        expect(wrapper.find('button[aria-label="Elegir en Métodos"]').exists()).toBe(false);
        await wrapper.get('textarea[aria-label="Métodos"]').setValue('Lecturas');
        expect(last(wrapper).content![1]!.content![0]!.attrs).toEqual({ kind: 'texto', options: [], value: 'Lecturas' });
    });
});
