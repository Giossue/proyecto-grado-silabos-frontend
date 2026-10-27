import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import type { DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';

const block = (kind: string, value: Record<string, unknown> = {}): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind, props: {}, value } }] });
const week = () => ({ contenidos: '', acd_h: '', ape_h: '', aa_h: '', acd: '', ape: '', aa: '', evaluacion: '' });
const units = () => Array.from({ length: 4 }, () => ({ nombre: '', resultado: '', semanas: Array.from({ length: 4 }, week) }));
const cell = (type: 'tableHeader' | 'tableCell', text = ''): DocumentNode => ({ type, content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] });
const bibliography: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [
    { type: 'tableRow', content: [cell('tableHeader', 'Autor'), cell('tableHeader', 'Título')] },
    { type: 'tableRow', content: [cell('tableCell'), cell('tableCell')] },
] }] };
const mountEditor = (template: DocumentNode, modelValue: DocumentNode | null) => mount(FieldResponseEditor, { props: { id: 'campo', label: 'Campo', template, modelValue } });
const emitted = (wrapper: ReturnType<typeof mountEditor>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;

describe('FieldResponseEditor', () => {
    beforeEach(() => setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, { horas_docencia: '64', horas_practicas: '0', horas_autonomas: '0' }));

    it('las unidades se llenan como formulario: una tarjeta por unidad y las semanas numeradas en orden', async () => {
        const wrapper = mountEditor(block('unidades'), block('unidades', { units: units() }));

        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.text()).toContain('Unidad 4');
        expect(wrapper.get('[aria-label="Unidad 2"]').text()).toContain('Semana 5');
        expect(wrapper.get('label[for="campo-0-units-0-semanas-0-acd_h"]').text()).toBe('ACD');

        await wrapper.get('#campo-0-units-0-nombre').setValue('Fundamentos');
        const value = emitted(wrapper).content![0]!.attrs!.value as { units: Array<{ nombre: string }> };
        expect(value.units[0]!.nombre).toBe('Fundamentos');
    });

    it('los datos de discapacidad aparecen solo si responde Sí', async () => {
        const wrapper = mountEditor(block('identificacion'), block('identificacion', { disability: { answer: 'no', type: '', description: '' } }));
        expect(wrapper.text()).toContain('Estudiantes con discapacidad');
        expect(wrapper.text()).not.toContain('Tipo de discapacidad');

        await wrapper.setProps({ modelValue: block('identificacion', { disability: { answer: 'si', type: '', description: '' } }) });
        expect(wrapper.text()).toContain('Tipo de discapacidad');
    });

    it('una tabla de respuestas se llena por filas con la etiqueta de cada columna', async () => {
        const wrapper = mountEditor(bibliography, null);

        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.get('[aria-label="Fila 1"]').text()).toContain('Autor');
        await wrapper.get('#campo-0-1-0').setValue('García');
        expect(emitted(wrapper).content![0]!.content![1]!.content![0]!.content![0]!.content![0]!.text).toBe('García');

        await wrapper.findAll('button').find((button) => button.text() === 'Agregar fila')!.trigger('click');
        expect(emitted(wrapper).content![0]!.content).toHaveLength(3);
    });
});
