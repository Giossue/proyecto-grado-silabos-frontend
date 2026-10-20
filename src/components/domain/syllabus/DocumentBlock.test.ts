import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';

const official = definition as unknown as TemplateDefinitionPayload;
const block = (kind: string, value: Record<string, unknown> = {}, props: Record<string, unknown> = {}): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind, props, value } }] });
const question = (value: Record<string, unknown> = { answer: null, rows: [] }): DocumentNode => block('si_no', value, { question: '¿Hay estudiantes con discapacidad?', columns: [{ key: 'tipo', label: 'Tipo' }, { key: 'detalle', label: 'Breve descripción' }] });
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountEditor = (modelValue: DocumentNode, blocks: 'configure' | 'fill' = 'fill') => {
    const wrapper = mount(FreeTextEditor, { props: { id: 'campo', label: 'Campo', modelValue, blocks }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const last = (wrapper: ReturnType<typeof mountEditor>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
const attrsOf = <T,>(document: DocumentNode): T => nodesOfType(document, 'documentBlock')[0]!.attrs as T;
const byLabel = <T extends Element = HTMLInputElement>(label: string): T => document.body.querySelector<T>(`[aria-label="${label}"]`)!;
const button = (text: string): HTMLButtonElement => [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(text))!;
const type = async (label: string, text: string): Promise<void> => {
    const input = byLabel(label);
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
};

describe('bloques definidos en la plantilla', () => {
    beforeEach(() => setTemplateRuntime(official, { nombre_facultad: 'Ciencias', formacion_docente: 'Formación escrita en el perfil', horas_docencia: '32', horas_practicas: '0', horas_autonomas: '32' }));
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    describe('pregunta Sí/No', () => {
        type Attrs = { props: { question: string; columns: Array<{ label: string }> }; value: { answer: string | null; rows: Array<Record<string, string>> } };

        it('el docente responde Sí, agrega una fila y la escribe', async () => {
            const wrapper = mountEditor(question());
            await flushPromises();
            expect(document.body.textContent).toContain('¿Hay estudiantes con discapacidad?');
            expect(document.body.querySelector('table')).toBeNull();

            document.body.querySelector<HTMLElement>('[role="radio"][value="si"]')!.click();
            await flushPromises();
            expect(attrsOf<Attrs>(last(wrapper)).value.answer).toBe('si');

            button('Agregar fila').click();
            await flushPromises();
            await type('Tipo, fila 1', 'Visual');
            expect(attrsOf<Attrs>(last(wrapper)).value.rows).toEqual([{ tipo: 'Visual', detalle: '' }]);
        });

        it('al responder No se descartan las filas', async () => {
            const wrapper = mountEditor(question({ answer: 'si', rows: [{ tipo: 'Visual', detalle: 'x' }] }));
            await flushPromises();
            document.body.querySelector<HTMLElement>('[role="radio"][value="no"]')!.click();
            await flushPromises();
            expect(attrsOf<Attrs>(last(wrapper)).value).toEqual({ answer: 'no', rows: [] });
        });

        it('el administrador cambia la pregunta y las columnas, pero no responde', async () => {
            const wrapper = mountEditor(question(), 'configure');
            await flushPromises();
            expect(document.body.querySelector('[role="radio"]')).toBeNull();
            await type('Pregunta', 'Otra pregunta');
            expect(attrsOf<Attrs>(last(wrapper)).props.question).toBe('Otra pregunta');

            button('Agregar columna').click();
            await flushPromises();
            expect(attrsOf<Attrs>(last(wrapper)).props.columns).toHaveLength(3);
        });

        it('en modo vista se ve la pregunta, la respuesta y la tabla', () => {
            const wrapper = mount(FreeTextContent, { props: { value: question({ answer: 'si', rows: [{ tipo: 'Visual', detalle: 'Baja visión' }] }) } });
            expect(wrapper.text()).toContain('¿Hay estudiantes con discapacidad? Sí');
            expect(wrapper.findAll('th').map((cell) => cell.text())).toEqual(['Tipo', 'Breve descripción']);
            expect(wrapper.find('td').text()).toBe('Visual');
        });

        it('una pregunta sin responder muestra la pregunta y no cuenta como contenido', () => {
            const wrapper = mount(FreeTextContent, { props: { value: question() } });
            expect(wrapper.text()).toContain('¿Hay estudiantes con discapacidad?');
            expect(wrapper.text()).not.toContain('Sin contenido');
        });
    });

    describe('identificación', () => {
        type Disability = { answer: string | null; type: string; description: string };
        const identification = (disability: Disability = { answer: null, type: '', description: '' }) => block('identificacion', { disability });
        const disabilityOf = (document: DocumentNode): Disability => attrsOf<{ value: { disability: Disability } }>(document).value.disability;

        it('se dibuja como una sola tabla con los datos del sistema y la respuesta marcada', () => {
            const wrapper = mount(FreeTextContent, { props: { value: identification({ answer: 'si', type: 'Visual', description: 'Baja visión' }) } });
            expect(wrapper.findAll('table')).toHaveLength(1);
            expect(wrapper.text()).toContain('FACULTAD: Ciencias');
            expect(wrapper.text()).toContain('Formación escrita en el perfil');
            expect(wrapper.text()).toContain('Tipo de discapacidad: Visual');
            expect(wrapper.findAll('td').map((item) => item.text())).toContain('X');
        });

        it('el docente marca Sí y escribe el tipo dentro de la misma tabla', async () => {
            const wrapper = mountEditor(identification());
            await flushPromises();
            expect(document.body.querySelectorAll('table')).toHaveLength(1);
            expect(byLabel('Tipo de discapacidad').disabled).toBe(true);

            byLabel<HTMLElement>('Estudiantes con discapacidad: Sí').click();
            await flushPromises();
            expect(disabilityOf(last(wrapper)).answer).toBe('si');

            await type('Tipo de discapacidad', 'Auditiva');
            expect(disabilityOf(last(wrapper)).type).toBe('Auditiva');
        });

        it('marcar No borra el detalle', async () => {
            const wrapper = mountEditor(identification({ answer: 'si', type: 'Visual', description: 'x' }));
            await flushPromises();
            byLabel<HTMLElement>('Estudiantes con discapacidad: No').click();
            await flushPromises();
            expect(disabilityOf(last(wrapper))).toEqual({ answer: 'no', type: '', description: '' });
        });

        it('el administrador la ve sin controles de respuesta', async () => {
            mountEditor(identification(), 'configure');
            await flushPromises();
            expect(document.body.querySelector('[aria-label="Tipo de discapacidad"]')).toBeNull();
            expect(document.body.textContent).toContain('FACULTAD: Ciencias');
        });
    });

    describe('unidades', () => {
        const unitsOf = (document: DocumentNode) => attrsOf<{ value: { units: Array<{ semanas: Array<Record<string, string>> }> } }>(document).value.units;
        const units = (weeks = 4): DocumentNode => block('unidades', { units: Array.from({ length: 4 }, () => ({ nombre: '', resultado: '', semanas: Array.from({ length: weeks }, () => ({ contenidos: '', acd_h: '', ape_h: '', aa_h: '', acd: '', ape: '', aa: '', evaluacion: '' })) })) });

        it('dibuja las cuatro unidades con la tabla oficial y las semanas numeradas del 1 al 16', () => {
            const wrapper = mount(FreeTextContent, { props: { value: units() } });
            expect(wrapper.findAll('table')).toHaveLength(4);
            expect(wrapper.text()).toContain('Nombre de la unidad');
            expect(wrapper.text()).toContain('DOCENCIA');
            expect(wrapper.text()).toContain('Total, horas');
            expect(wrapper.findAll('td').map((cell) => cell.text())).toContain('16');
        });

        it('compara las horas repartidas con las de la asignatura y avisa cuáles no cuadran', async () => {
            const wrapper = mountEditor(units());
            await flushPromises();
            await type('ACD, unidad 1, semana 1', '32');
            expect(unitsOf(last(wrapper))[0]!.semanas[0]!.acd_h).toBe('32');
            const summary = document.body.querySelector('[data-block-summary]')!.textContent!;
            expect(summary).toContain('Semanas 16 de 16');
            expect(summary).toContain('ACD 32 de 32');
            expect(summary).toContain('APE 0 de 0');
            expect(summary).toContain('AA 0 de 32');
        });

        it('no deja pasar de 16 semanas y quita las que sobran', async () => {
            const wrapper = mountEditor(units());
            await flushPromises();
            expect(byLabel<HTMLButtonElement>('Agregar semana (unidad 1)').disabled).toBe(true);
            byLabel<HTMLButtonElement>('Quitar unidad 4, semana 4').click();
            await flushPromises();
            expect(unitsOf(last(wrapper))[3]!.semanas).toHaveLength(3);
            byLabel<HTMLButtonElement>('Agregar semana (unidad 1)').click();
            await flushPromises();
            expect(unitsOf(last(wrapper))[0]!.semanas).toHaveLength(5);
        });
    });

    describe('evaluación', () => {
        it('con horas de práctico-experimental reparte 2,5, 2, 2 y 3,5 puntos', () => {
            setTemplateRuntime(official, { horas_practicas: '16' });
            const text = mount(FreeTextContent, { props: { value: block('evaluacion') } }).text();
            expect(text).toContain('2.5 PUNTOS');
            expect(text).toContain('práctico-experimental');
        });

        it('sin horas de práctico-experimental usa 3,5, 3 y 3,5 puntos y quita la fila', () => {
            const text = mount(FreeTextContent, { props: { value: block('evaluacion') } }).text();
            expect(text).toContain('3.0 PUNTOS');
            expect(text).not.toContain('práctico-experimental');
        });
    });
});
