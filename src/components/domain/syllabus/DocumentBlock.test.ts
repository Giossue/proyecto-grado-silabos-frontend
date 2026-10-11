import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { setBlockLayouts } from '@/lib/blockLayouts';
import { newBlock, nodesOfType, type DocumentNode } from '@/lib/templateDocument';

const disability = (value: Record<string, unknown> = { answer: null, rows: [] }): DocumentNode => ({
    type: 'doc',
    content: [{ type: 'documentBlock', attrs: {
        kind: 'si_no',
        props: { question: '¿Hay estudiantes con discapacidad?', columns: [{ key: 'tipo', label: 'Tipo' }, { key: 'detalle', label: 'Breve descripción' }] },
        value,
    } }],
});
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountEditor = (modelValue: DocumentNode, blocks: 'configure' | 'fill' = 'fill') => {
    const wrapper = mount(FreeTextEditor, { props: { id: 'campo', label: 'Campo', modelValue, blocks }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const last = (wrapper: ReturnType<typeof mountEditor>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
const attrsOf = (document: DocumentNode) => nodesOfType(document, 'documentBlock')[0]!.attrs as { props: { question: string; columns: Array<{ label: string }> }; value: { answer: string | null; rows: Array<Record<string, string>> } };

describe('bloques dentro del documento', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('el docente responde Sí, agrega una fila y la escribe', async () => {
        const wrapper = mountEditor(disability());
        await flushPromises();
        expect(document.body.textContent).toContain('¿Hay estudiantes con discapacidad?');
        expect(document.body.querySelector('table')).toBeNull();

        document.body.querySelector<HTMLElement>('[role="radio"][value="true"]')!.click();
        await flushPromises();
        expect(attrsOf(last(wrapper)).value.answer).toBe('si');

        const add = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Agregar fila'))!;
        add.click();
        await flushPromises();
        const input = document.body.querySelector<HTMLInputElement>('[aria-label="Tipo, fila 1"]')!;
        input.value = 'Visual';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();
        expect(attrsOf(last(wrapper)).value.rows).toEqual([{ tipo: 'Visual', detalle: '' }]);
    });

    it('al responder No se descartan las filas', async () => {
        const wrapper = mountEditor(disability({ answer: 'si', rows: [{ tipo: 'Visual', detalle: 'x' }] }));
        await flushPromises();
        document.body.querySelector<HTMLElement>('[role="radio"][value="false"]')!.click();
        await flushPromises();
        expect(attrsOf(last(wrapper)).value).toEqual({ answer: 'no', rows: [] });
    });

    it('el administrador cambia la pregunta y las columnas, pero no responde', async () => {
        const wrapper = mountEditor(disability(), 'configure');
        await flushPromises();
        expect(document.body.querySelector('[role="radio"]')).toBeNull();
        const question = document.body.querySelector<HTMLInputElement>('[aria-label="Pregunta del bloque"]')!;
        question.value = 'Otra pregunta';
        question.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();
        expect(attrsOf(last(wrapper)).props.question).toBe('Otra pregunta');

        [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Agregar columna'))!.click();
        await flushPromises();
        expect(attrsOf(last(wrapper)).props.columns).toHaveLength(3);
    });

    it('el menú Bloque inserta una pregunta Sí/No y una lista repetible', async () => {
        const wrapper = mountEditor({ type: 'doc', content: [{ type: 'paragraph' }] }, 'configure');
        await flushPromises();
        const editor = (wrapper.vm as unknown as { editor: { commands: { insertContent: (content: unknown) => boolean } } }).editor;
        editor.commands.insertContent([newBlock('si_no'), { type: 'paragraph' }]);
        editor.commands.insertContent([newBlock('repetible'), { type: 'paragraph' }]);
        await flushPromises();
        expect(nodesOfType(last(wrapper), 'documentBlock').map((node) => node.attrs?.kind)).toEqual(['si_no', 'repetible']);
    });

    it('en modo vista se ve la pregunta, la respuesta y la tabla', async () => {
        const wrapper = mount(FreeTextContent, { props: { value: disability({ answer: 'si', rows: [{ tipo: 'Visual', detalle: 'Baja visión' }] }) } });
        expect(wrapper.text()).toContain('¿Hay estudiantes con discapacidad? Sí');
        expect(wrapper.findAll('th').map((cell) => cell.text())).toEqual(['Tipo', 'Breve descripción']);
        expect(wrapper.find('td').text()).toBe('Visual');
    });

    it('una pregunta sin responder no se muestra como contenido vacío', () => {
        const wrapper = mount(FreeTextContent, { props: { value: disability() } });
        expect(wrapper.text()).toContain('Sin responder');
        expect(wrapper.text()).not.toContain('Sin contenido');
    });

    describe('identificación como una sola tabla', () => {
        const cell = (type: string, text: string, attrs: Record<string, unknown> = {}): DocumentNode => ({ type, attrs: { colspan: 1, rowspan: 1, ...attrs }, content: [{ type: 'paragraph', content: text === '' ? [] : [{ type: 'text', text }] }] });
        const slot = (id: string): DocumentNode => ({ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'variable', attrs: { id, label: id } }] }] });
        const layout: DocumentNode = { type: 'table', content: [
            { type: 'tableRow', content: [cell('tableHeader', 'FACULTAD: Ciencias')] },
            { type: 'tableRow', content: [cell('tableHeader', 'ESTUDIANTES CON DISCAPACIDAD'), cell('tableCell', 'Sí'), slot('discapacidad_si'), cell('tableCell', 'No'), slot('discapacidad_no'), slot('discapacidad_tipo'), slot('discapacidad_descripcion')] },
            { type: 'tableRow', content: [cell('tableCell', 'Formación escrita en el perfil')] },
        ] };
        const identification = (disability: Record<string, unknown> = { answer: null, type: '', description: '' }): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind: 'identificacion', props: {}, value: { disability } } }] });
        const disabilityOf = (document: DocumentNode) => (nodesOfType(document, 'documentBlock')[0]!.attrs as { value: { disability: { answer: string | null; type: string; description: string } } }).value.disability;

        it('se dibuja como una sola tabla con la respuesta marcada', () => {
            setBlockLayouts({ identificacion: { table: layout } });
            const wrapper = mount(FreeTextContent, { props: { value: identification({ answer: 'si', type: 'Visual', description: 'Baja visión' }) } });
            expect(wrapper.findAll('table')).toHaveLength(1);
            expect(wrapper.text()).toContain('FACULTAD: Ciencias');
            expect(wrapper.text()).toContain('Formación escrita en el perfil');
            const cells = wrapper.findAll('td').map((item) => item.text());
            expect(cells).toEqual(expect.arrayContaining(['X', 'Visual', 'Baja visión']));
        });

        it('el docente marca Sí y escribe el tipo dentro de la misma tabla', async () => {
            setBlockLayouts({ identificacion: { table: layout } });
            const wrapper = mountEditor(identification());
            await flushPromises();
            expect(document.body.querySelectorAll('table')).toHaveLength(1);
            expect(document.body.querySelector<HTMLInputElement>('[aria-label="Tipo de discapacidad"]')!.disabled).toBe(true);

            document.body.querySelector<HTMLElement>('[aria-label="Hay estudiantes con discapacidad"]')!.click();
            await flushPromises();
            expect(disabilityOf(last(wrapper)).answer).toBe('si');

            const input = document.body.querySelector<HTMLInputElement>('[aria-label="Tipo de discapacidad"]')!;
            input.value = 'Auditiva';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flushPromises();
            expect(disabilityOf(last(wrapper)).type).toBe('Auditiva');
        });

        it('marcar No borra el detalle', async () => {
            setBlockLayouts({ identificacion: { table: layout } });
            const wrapper = mountEditor(identification({ answer: 'si', type: 'Visual', description: 'x' }));
            await flushPromises();
            document.body.querySelector<HTMLElement>('[aria-label="No hay estudiantes con discapacidad"]')!.click();
            await flushPromises();
            expect(disabilityOf(last(wrapper))).toEqual({ answer: 'no', type: '', description: '' });
        });

        it('el administrador la ve sin controles de respuesta', async () => {
            setBlockLayouts({ identificacion: { table: layout } });
            mountEditor(identification(), 'configure');
            await flushPromises();
            expect(document.body.querySelector('[aria-label="Tipo de discapacidad"]')).toBeNull();
            expect(document.body.querySelector('[aria-label="Quitar el bloque"]')).toBeNull();
        });
    });

    describe('unidades', () => {
        const units = (): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind: 'unidades', props: {}, value: {} } }] });
        const unitsOf = (document: DocumentNode) => (nodesOfType(document, 'documentBlock')[0]!.attrs as { value: { units: Array<{ semanas: Array<Record<string, string>> }> } }).value.units;
        const type = async (label: string, text: string) => {
            const input = document.body.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flushPromises();
        };

        it('arranca con cuatro unidades de cuatro semanas, numeradas del 1 al 16', async () => {
            setBlockLayouts({ unidades: { weeks: 16, hours: { acd: 32, ape: 32, aa: 32 } } });
            mountEditor(units());
            await flushPromises();
            expect(document.body.querySelectorAll('[data-unit]')).toHaveLength(4);
            expect(document.body.querySelector('[aria-label="Contenidos temáticos, semana 16"]')).not.toBeNull();
            expect(document.body.querySelector('[aria-label="Contenidos temáticos, semana 17"]')).toBeNull();
        });

        it('compara las horas repartidas con las de la asignatura y avisa cuáles no cuadran', async () => {
            setBlockLayouts({ unidades: { weeks: 16, hours: { acd: 32, ape: 0, aa: 32 } } });
            const wrapper = mountEditor(units());
            await flushPromises();
            await type('ACD, semana 1', '32');
            expect(unitsOf(last(wrapper))[0]!.semanas[0]!.acd_h).toBe('32');
            const summary = document.body.querySelector('[data-units-summary]')!.textContent!;
            expect(summary).toContain('Semanas 16 de 16');
            expect(summary).toContain('ACD 32 de 32');
            expect(summary).toContain('APE 0 de 0');
            expect(summary).toContain('AA 0 de 32');
        });

        it('no deja pasar de 16 semanas y quita las que sobran', async () => {
            setBlockLayouts({ unidades: { weeks: 16, hours: { acd: 0, ape: 0, aa: 0 } } });
            const wrapper = mountEditor(units());
            await flushPromises();
            const add = document.body.querySelector<HTMLButtonElement>('[aria-label="Agregar una semana a la unidad 1"]')!;
            expect(add.disabled).toBe(true);
            document.body.querySelector<HTMLButtonElement>('[aria-label="Quitar la semana 16"]')!.click();
            await flushPromises();
            expect(unitsOf(last(wrapper))[3]!.semanas).toHaveLength(3);
            document.body.querySelector<HTMLButtonElement>('[aria-label="Agregar una semana a la unidad 1"]')!.click();
            await flushPromises();
            expect(unitsOf(last(wrapper))[0]!.semanas).toHaveLength(5);
        });
    });

    describe('evaluacion', () => {
        const evaluation = (): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind: 'evaluacion', props: {}, value: {} } }] });

        it('con horas de práctico-experimental reparte 2,5, 2, 2 y 3,5 puntos', async () => {
            setBlockLayouts({ evaluacion: { with_practice: true } });
            mountEditor(evaluation());
            await flushPromises();
            expect(document.body.querySelector('[data-evaluation]')!.textContent).toContain('2.5 PUNTOS');
            expect(document.body.querySelector('[data-evaluation]')!.textContent).toContain('práctico-experimental');
        });

        it('sin horas de práctico-experimental usa 3,5, 3 y 3,5 puntos y quita la fila', async () => {
            setBlockLayouts({ evaluacion: { with_practice: false } });
            mountEditor(evaluation());
            await flushPromises();
            const text = document.body.querySelector('[data-evaluation]')!.textContent!;
            expect(text).toContain('3.0 PUNTOS');
            expect(text).not.toContain('práctico-experimental');
        });
    });
});
