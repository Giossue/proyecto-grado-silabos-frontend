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
const ribbon = (wrapper: ReturnType<typeof mountSetup>, label: string) => wrapper.get('[role="toolbar"]').findAll('button').find((button) => button.text() === label)!;

describe('Armar tipos de respuesta en un campo del docente', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('la cinta convierte la celda elegida en una respuesta y las opciones se escriben ahí mismo', async () => {
        const wrapper = mountSetup(template());
        expect(wrapper.find('textarea').exists()).toBe(false);
        expect(wrapper.text()).toContain('Estrategias de la asignatura');
        expect(wrapper.get('[role="toolbar"]').attributes('aria-label')).toBe('Tipo de respuesta de Métodos');
        expect(wrapper.get('[role="toolbar"]').findAll('button').map((button) => button.text())).toEqual(['Texto libre', 'Número', 'Elegir una', 'Elegir varias']);
        expect(ribbon(wrapper, 'Elegir una').attributes('disabled')).toBeDefined();
        expect(wrapper.findAll('button').some((button) => button.text() === 'Agregar fila')).toBe(false);

        await wrapper.get('button[aria-label="Técnica, fila 1: Texto libre"]').trigger('click');
        expect(ribbon(wrapper, 'Texto libre').attributes('aria-pressed')).toBe('true');
        await ribbon(wrapper, 'Elegir una').trigger('click');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content).toEqual([{ type: 'response', attrs: { kind: 'una', options: [], value: null } }]);
        expect(last(wrapper).content![0]).toEqual(template().content![0]);

        await wrapper.setProps({ modelValue: last(wrapper) });
        expect(wrapper.find('button[aria-label="Técnica, fila 1: Elegir una"]').exists()).toBe(true);
        await wrapper.get('input[aria-label="Opción 1"]').setValue('Taller');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs).toEqual({ kind: 'una', options: [{ const: 'o1', title: 'Taller' }], value: null });

        await wrapper.setProps({ modelValue: last(wrapper) });
        await ribbon(wrapper, 'Elegir varias').trigger('click');
        expect(last(wrapper).content![2]!.content![1]!.content![0]!.content![0]!.content![0]!.attrs).toEqual({ kind: 'varias', options: [{ const: 'o1', title: 'Taller' }], value: [] });

        await wrapper.setProps({ modelValue: last(wrapper) });
        await ribbon(wrapper, 'Texto libre').trigger('click');
        expect(last(wrapper)).toEqual(template());
    });

    it('un espacio suelto se vuelve número y un campo vacío completo también se arma', async () => {
        const wrapper = mountSetup(template());
        await wrapper.get('button[aria-label="Métodos: Texto libre"]').trigger('click');
        await ribbon(wrapper, 'Número').trigger('click');
        expect(last(wrapper).content![1]!.content).toEqual([{ type: 'response', attrs: { kind: 'numero', options: [], value: '' } }]);
        await wrapper.setProps({ modelValue: last(wrapper) });
        expect(wrapper.find('input[aria-label="Opción 1"]').exists()).toBe(false);

        const whole = mountSetup({ type: 'doc', content: [{ type: 'paragraph' }] });
        await flushPromises();
        expect(whole.find('[aria-label="Negrita"]').exists()).toBe(false);
        await whole.get('button[aria-label="Métodos: Texto libre"]').trigger('click');
        await ribbon(whole, 'Elegir varias').trigger('click');
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
        expect(ribbon(wrapper, 'Número').attributes('disabled')).toBeDefined();
    });
});
