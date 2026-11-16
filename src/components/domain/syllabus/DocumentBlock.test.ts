import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLibraryCatalog } from '@/api/libraryCatalog';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';
import definition from '@/test/fixtures/template-definition.json';
import { catalogResults } from '@/test/libraryCatalog';

vi.mock('@/api/libraryCatalog');

const official = definition as unknown as TemplateDefinitionPayload;
const block = (kind: string, value: Record<string, unknown> = {}, props: Record<string, unknown> = {}): DocumentNode => ({ type: 'doc', content: [{ type: 'documentBlock', attrs: { kind, props, value } }] });
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountEditor = (modelValue: DocumentNode, blocks: 'configure' | 'fill' = 'fill') => {
    const wrapper = mount(FreeTextEditor, { props: { id: 'campo', label: 'Campo', modelValue, blocks }, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
};
const last = (wrapper: ReturnType<typeof mountEditor>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
const attrsOf = <T,>(document: DocumentNode): T => nodesOfType(document, 'documentBlock')[0]!.attrs as T;
const byLabel = <T extends Element = HTMLInputElement>(label: string): T => document.body.querySelector<T>(`[aria-label="${label}"]`)!;
const type = async (label: string, text: string): Promise<void> => {
    const input = byLabel(label);
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
};

describe('bloques definidos en la plantilla', () => {
    beforeEach(() => setTemplateRuntime(official, { nombre_facultad: 'Ciencias', formacion_docente: 'Formación escrita en el perfil', horas_docencia: '32', horas_practicas: '0', horas_autonomas: '32', semanas_periodo: '16' }));
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

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

        it('en el editor del docente las celdas muestran el valor real y no hay botón de datos del sistema', async () => {
            mountEditor(identification());
            await flushPromises();
            expect(document.body.querySelector('[data-block]')!.textContent).toContain('Ciencias');
            expect(document.body.querySelector('[data-block]')!.textContent).not.toContain('Nombre de la facultad');
            expect(document.body.querySelector('[aria-label="Insertar dato del sistema"]')).toBeNull();
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

    describe('bibliografía', () => {
        type Book = Record<'autor' | 'titulo' | 'anio' | 'ciudad' | 'editorial' | 'isbn' | 'codigo', string>;
        const empty: Book = { autor: '', titulo: '', anio: '', ciudad: '', editorial: '', isbn: '', codigo: '' };
        const booksOf = (document: DocumentNode): Book[] => attrsOf<{ value: { libros: Book[] } }>(document).value.libros;
        const bibliography = (libros: Book[] = [empty]) => block('bibliografia', { libros });
        const buttonWith = (text: string): HTMLButtonElement => [...document.body.querySelectorAll('button')].find((item) => item.textContent?.trim() === text) as HTMLButtonElement;

        it('se dibuja como la tabla de siempre, con los siete títulos y una fila por libro', () => {
            const wrapper = mount(FreeTextContent, { props: { value: bibliography([{ ...empty, titulo: 'Proyectos de inversión', isbn: '9789563431063' }, { ...empty, titulo: 'Zootecnia básica' }]) } });

            expect(wrapper.findAll('th').map((item) => item.text())).toEqual(['Autor', 'Título', 'Año', 'Ciudad', 'Editorial', 'ISBN', 'Código']);
            expect(wrapper.findAll('tr')).toHaveLength(3);
            expect(wrapper.text()).toContain('9789563431063');
        });

        it('el docente escribe en las columnas y agrega o quita libros', async () => {
            const wrapper = mountEditor(bibliography());
            await flushPromises();

            await type('Título, libro 1', 'Proyectos de inversión');
            expect(booksOf(last(wrapper))[0]!.titulo).toBe('Proyectos de inversión');
            byLabel<HTMLButtonElement>('Agregar libro').click();
            await flushPromises();
            expect(booksOf(last(wrapper))).toHaveLength(2);
        });

        it('busca en la biblioteca y llena la fila vacía con el libro elegido', async () => {
            vi.mocked(searchLibraryCatalog).mockResolvedValue(catalogResults([{ id: '10525', title: 'Proyectos de inversión', author: 'Sapag Chain, Nassir', year: '2011', place: 'Santiago de Chile', publisher: 'Pearson Educación', isbn: '9789563431063', call_number: '658.404 S2411p', format: 'Libro físico', kind: 'Libro' }]));
            const wrapper = mountEditor(bibliography());
            await flushPromises();

            buttonWith('Buscar en la biblioteca').click();
            await flushPromises();
            const input = byLabel('Texto a buscar');
            input.value = 'Sapag';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flushPromises();
            document.body.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await flushPromises();
            buttonWith('Agregar').click();
            await flushPromises();

            expect(booksOf(last(wrapper))).toEqual([{ autor: 'Sapag Chain, Nassir', titulo: 'Proyectos de inversión', anio: '2011', ciudad: 'Santiago de Chile', editorial: 'Pearson Educación', isbn: '9789563431063', codigo: 'Libro físico' }]);
        });

        it('Administración la ve sin el buscador', async () => {
            mountEditor(bibliography(), 'configure');
            await flushPromises();

            expect(buttonWith('Buscar en la biblioteca')).toBeUndefined();
        });
    });
});
