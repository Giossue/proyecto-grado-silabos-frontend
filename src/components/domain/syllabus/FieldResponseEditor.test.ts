import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLibraryCatalog } from '@/api/libraryCatalog';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import type { DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';
import { catalogResults } from '@/test/libraryCatalog';

vi.mock('@/api/libraryCatalog');

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

    it('un campo de texto libre ofrece formato y listas, pero no tablas', async () => {
        const wrapper = mountEditor({ type: 'doc', content: [{ type: 'paragraph' }] }, null);
        await flushPromises();

        expect(wrapper.find('[aria-label="Lista con viñetas"]').exists()).toBe(true);
        expect(wrapper.find('[aria-label="Insertar tabla"]').exists()).toBe(false);
    });

    it('las unidades van en un acordeón y sus semanas en una tabla del sistema, numeradas en orden', async () => {
        const wrapper = mountEditor(block('unidades'), block('unidades', { units: units() }));

        expect(wrapper.text()).toContain('Unidad 4');
        expect(wrapper.find('[aria-label="ACD, semana 5"]').exists()).toBe(false);
        await wrapper.get('[aria-label="Unidad 2"] button').trigger('click');
        await flushPromises();
        const second = wrapper.get('[aria-label="Unidad 2"]');
        expect(second.findAll('[data-slot="table-head"]').map((head) => head.text())).toContain('Contenidos temáticos');
        expect(second.find('[aria-label="ACD, semana 5"]').exists()).toBe(true);
        expect(wrapper.get('#campo-0-units-0-semanas-0-acd_h').attributes('aria-label')).toBe('ACD, semana 1');
        expect(wrapper.get('#campo-0-units-0-nombre').element.tagName).toBe('INPUT');
        expect(wrapper.get('#campo-0-units-0-resultado').element.tagName).toBe('TEXTAREA');

        const hours = wrapper.get('#campo-0-units-0-semanas-0-acd_h').element as HTMLInputElement;
        hours.value = '2,5';
        hours.setSelectionRange(3, 3);
        const typed = (data: string): boolean => !hours.dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true }));
        expect(typed('a')).toBe(true);
        expect(typed('5')).toBe(false);
        expect(typed(',')).toBe(true);

        await wrapper.get('#campo-0-units-0-nombre').setValue('Fundamentos');
        const value = emitted(wrapper).content![0]!.attrs!.value as { units: Array<{ nombre: string }> };
        expect(value.units[0]!.nombre).toBe('Fundamentos');
    });

    it('el docente agrega unidades hasta las que permite la plantilla', async () => {
        const wrapper = mountEditor(block('unidades'), block('unidades', { units: units() }));

        await wrapper.findAll('button').find((button) => button.text() === 'Agregar unidad')!.trigger('click');
        expect((emitted(wrapper).content![0]!.attrs!.value as { units: unknown[] }).units).toHaveLength(5);
    });

    it('dice qué falta en cada unidad, sin badges ni contadores', () => {
        const filled = units().map((unit, index) => index === 0 ? { ...unit, nombre: 'Matrices', resultado: 'Resuelve sistemas' } : index === 3 ? { ...unit, semanas: [] } : unit);
        const wrapper = mountEditor(block('unidades'), block('unidades', { units: filled }));

        const items = wrapper.findAll('[aria-label^="Unidad "]');
        expect(items[0]!.text()).not.toContain('Falta');
        expect(items[1]!.text()).toContain('Falta: nombre de la unidad, resultados de aprendizaje');
        expect(items[3]!.text()).toContain('Falta: nombre de la unidad, resultados de aprendizaje, semanas');
        expect(wrapper.text()).not.toContain('Pendiente');
        expect(wrapper.find('[data-block-summary]').exists()).toBe(false);
    });

    it('una unidad nueva arranca con las semanas mínimas de la plantilla', async () => {
        const limited = structuredClone(definition) as unknown as TemplateDefinitionPayload;
        const unitsSchema = limited.blocks.unidades!.value.units as unknown as { minItems: number; items: { properties: { semanas: { minItems: number } } } };
        unitsSchema.items.properties.semanas.minItems = 2;
        setTemplateRuntime(limited, { horas_docencia: '64', horas_practicas: '0', horas_autonomas: '0' });
        const wrapper = mountEditor(block('unidades'), block('unidades', { units: units() }));

        await wrapper.findAll('button').find((button) => button.text() === 'Agregar unidad')!.trigger('click');
        expect((emitted(wrapper).content![0]!.attrs!.value as { units: Array<{ semanas: unknown[] }> }).units[4]!.semanas).toHaveLength(2);
    });

    it('un campo de plantilla antigua que solo tiene bloques también se llena como formulario', () => {
        const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Unidades', template: null, modelValue: block('unidades', { units: units() }) } });

        expect(wrapper.find('[role="textbox"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Unidad 1');
        expect(wrapper.find('[data-block-summary]').exists()).toBe(false);
    });

    it('los datos de discapacidad aparecen solo si responde Sí y llevan asterisco de obligatorio', async () => {
        const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Campo', required: true, template: block('identificacion'), modelValue: block('identificacion', { disability: { answer: 'no', type: '', description: '' } }) } });
        expect(wrapper.text()).toContain('Estudiantes con discapacidad*');
        expect(wrapper.text()).not.toContain('Tipo de discapacidad');

        await wrapper.setProps({ modelValue: block('identificacion', { disability: { answer: 'si', type: '', description: '' } }) });
        expect(wrapper.text()).toContain('Tipo de discapacidad');
    });

    it('una tabla de respuestas se llena dentro de una tabla del sistema con el encabezado de la plantilla', async () => {
        const wrapper = mountEditor(bibliography, null);

        expect(wrapper.findAll('[data-slot="table-head"]').map((head) => head.text())).toEqual(['Autor', 'Título', 'Acciones']);
        expect(wrapper.get('#campo-0-1-0').attributes('aria-label')).toBe('Autor, fila 1');
        await wrapper.get('#campo-0-1-0').setValue('García');
        expect(emitted(wrapper).content![0]!.content![1]!.content![0]!.content![0]!.content![0]!.text).toBe('García');

        await wrapper.findAll('button').find((button) => button.text() === 'Agregar fila')!.trigger('click');
        expect(emitted(wrapper).content![0]!.content).toHaveLength(3);
    });

    it('un encabezado de dos niveles nombra cada columna por su celda más baja', () => {
        const head = (text: string, attrs: Record<string, number> = {}): DocumentNode => ({ ...cell('tableHeader', text), attrs });
        const contribution: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [
            { type: 'tableRow', content: [head('Resultado de la asignatura', { rowspan: 2 }), head('Nivel', { colspan: 2 }), head('Resultado de la carrera', { rowspan: 2 })] },
            { type: 'tableRow', content: [head('Alta'), head('Baja')] },
            { type: 'tableRow', content: [cell('tableCell'), cell('tableCell'), cell('tableCell'), cell('tableCell')] },
        ] }] };
        const wrapper = mountEditor(contribution, null);

        expect(['#campo-0-2-0', '#campo-0-2-1', '#campo-0-2-2', '#campo-0-2-3'].map((id) => wrapper.get(id).attributes('aria-label')))
            .toEqual(['Resultado de la asignatura, fila 1', 'Alta, fila 1', 'Baja, fila 1', 'Resultado de la carrera, fila 1']);
    });

    describe('bibliografía con el catálogo de la biblioteca', () => {
        const empty = { autor: '', titulo: '', anio: '', ciudad: '', editorial: '', isbn: '', codigo: '' };
        const found = { id: '10525', title: 'Proyectos de inversión', author: 'Sapag Chain, Nassir', year: '2011', place: 'Santiago de Chile', publisher: 'Pearson Educación', isbn: '9789563431063', call_number: '658.404 S2411p' };
        const wrappers: Array<ReturnType<typeof mountEditor>> = [];
        const mountBibliography = (disabled = false) => {
            const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Campo', template: block('bibliografia'), modelValue: block('bibliografia', { libros: [empty] }), disabled }, attachTo: document.body });
            wrappers.push(wrapper);

            return wrapper;
        };
        const buttonWith = (text: string): HTMLButtonElement | undefined => [...document.body.querySelectorAll('button')].find((item) => item.textContent?.trim() === text);
        afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

        it('ofrece «Buscar en la biblioteca» y llena la fila con el libro elegido', async () => {
            vi.mocked(searchLibraryCatalog).mockResolvedValue(catalogResults([found]));
            const wrapper = mountBibliography();
            await flushPromises();

            buttonWith('Buscar en la biblioteca')!.click();
            await flushPromises();
            const input = document.body.querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!;
            input.value = 'Sapag';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flushPromises();
            document.body.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await flushPromises();
            buttonWith('Agregar')!.click();
            await flushPromises();

            const attrs = emitted(wrapper).content![0]!.attrs as unknown as { value: { libros: Array<Record<string, string>> } };
            expect(attrs.value.libros).toEqual([{ autor: 'Sapag Chain, Nassir', titulo: 'Proyectos de inversión', anio: '2011', ciudad: 'Santiago de Chile', editorial: 'Pearson Educación', isbn: '9789563431063', codigo: '658.404 S2411p' }]);
        });

        it('«Limpiar» vacía la fila sin quitarla, y con una sola fila el botón de borrar no se puede usar', async () => {
            const filled = { autor: 'Sapag Chain, Nassir', titulo: 'Proyectos de inversión', anio: '2011', ciudad: 'Santiago de Chile', editorial: 'Pearson Educación', isbn: '9789563431063', codigo: '658.404 S2411p' };
            const wrapper = mount(FieldResponseEditor, { props: { id: 'campo', label: 'Campo', template: block('bibliografia'), modelValue: block('bibliografia', { libros: [filled] }) }, attachTo: document.body });
            wrappers.push(wrapper);
            await flushPromises();

            expect(document.body.querySelector<HTMLButtonElement>('[aria-label="Quitar libro 1"]')!.disabled).toBe(true);
            document.body.querySelector<HTMLButtonElement>('[aria-label="Limpiar libro 1"]')!.click();
            await flushPromises();

            const attrs = emitted(wrapper).content![0]!.attrs as unknown as { value: { libros: Array<Record<string, string>> } };
            expect(attrs.value.libros).toEqual([{ autor: '', titulo: '', anio: '', ciudad: '', editorial: '', isbn: '', codigo: '' }]);
        });

        it('«Limpiar» no se puede usar en una fila vacía', async () => {
            mountBibliography();
            await flushPromises();
            expect(document.body.querySelector<HTMLButtonElement>('[aria-label="Limpiar libro 1"]')!.disabled).toBe(true);
        });

        it('con el sílabo bloqueado no se puede buscar', async () => {
            mountBibliography(true);
            await flushPromises();

            expect(buttonWith('Buscar en la biblioteca')!.disabled).toBe(true);
        });
    });
});
