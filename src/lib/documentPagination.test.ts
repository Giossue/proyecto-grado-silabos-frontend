import { afterEach, describe, expect, it } from 'vitest';
import {
    createDocumentPaginator,
    registerPageEditor,
} from '@/lib/documentPagination';
import type { PageSpacerRequest } from '@/lib/documentPagination';

const PAGE = { width: 800, height: 100, margin: 0, gap: 0 };

/** Coloca cada fila 60 px debajo de la anterior: la segunda cruza la hoja. */
const tableWithRows = (editable: boolean): HTMLElement => {
    const root = document.createElement('div');
    root.innerHTML = `
        <div data-page-unit data-page-flow-through>
            <div contenteditable="${editable}">
                <table><tbody><tr><td>A</td></tr><tr><td>B</td></tr></tbody></table>
            </div>
        </div>`;
    root.querySelectorAll('tr').forEach((row, index) => {
        row.getBoundingClientRect = () =>
            ({ top: 10 + index * 60, bottom: 70 + index * 60, left: 0, right: 100 }) as DOMRect;
    });
    root.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    document.body.append(root);

    return root;
};

describe('createDocumentPaginator', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('parte una tabla de lectura entre hojas con una fila espaciadora', () => {
        const root = tableWithRows(false);

        createDocumentPaginator(root, () => PAGE).paginate();

        expect(root.querySelectorAll('tr[data-page-spacer]')).toHaveLength(1);
    });

    it('no inserta filas dentro de una tabla que se está editando', () => {
        const root = tableWithRows(true);

        createDocumentPaginator(root, () => PAGE).paginate();

        expect(root.querySelectorAll('tr[data-page-spacer]')).toHaveLength(0);
    });

    it('pide al editor registrado que dibuje el salto antes de la fila que cruza la hoja', () => {
        const root = tableWithRows(true);
        const host = root.querySelector<HTMLElement>('[contenteditable]')!;
        const calls: PageSpacerRequest[][] = [];
        const unregister = registerPageEditor(host, {
            clear: () => calls.push([]),
            apply: (requests) => calls.push(requests),
        });

        createDocumentPaginator(root, () => PAGE).paginate();
        unregister();

        const last = calls.at(-1)!;
        expect(root.querySelectorAll('[data-page-spacer]')).toHaveLength(0);
        expect(last).toHaveLength(1);
        expect(last[0].element).toBe(root.querySelectorAll('tr')[1]);
        expect(last[0].height).toBe(30);
    });

    it('mide respecto de la hoja aunque el navegador desplace la vista al insertar un salto', () => {
        // Bloques apilados: título 1, tabla alta, título 2 con su texto, título 3.
        const root = document.createElement('div');
        root.innerHTML = `
            <section data-page-unit data-page-keep-next data-h="10">1.</section>
            <section data-page-unit data-h="60">Tabla</section>
            <section data-page-unit data-page-keep-next data-h="10">2.</section>
            <section data-page-unit data-h="40">2.1</section>
            <section data-page-unit data-page-keep-next data-h="10">3.</section>
            <section data-page-unit data-h="50">3.1</section>`;
        const blocks = () => Array.from(root.children) as HTMLElement[];
        const heightOf = (element: HTMLElement) =>
            element.hasAttribute('data-page-spacer')
                ? parseFloat(element.style.height)
                : Number(element.dataset.h);
        // Anclaje de desplazamiento: cada salto insertado desplaza la vista lo mismo
        // que mide, de modo que las coordenadas de la ventana cambian a mitad del cálculo.
        const scroll = () =>
            blocks()
                .filter((block) => block.hasAttribute('data-page-spacer'))
                .reduce((sum, block) => sum + heightOf(block), 0);
        const layoutTop = (element: HTMLElement) =>
            blocks()
                .slice(0, blocks().indexOf(element))
                .reduce((sum, block) => sum + heightOf(block), 0);
        root.getBoundingClientRect = () => ({ top: -scroll(), left: 0 }) as DOMRect;
        root.querySelectorAll<HTMLElement>('section').forEach((block) => {
            block.getBoundingClientRect = () => {
                const top = layoutTop(block) - scroll();

                return { top, bottom: top + heightOf(block), left: 0, right: 100 } as DOMRect;
            };
        });
        document.body.append(root);

        createDocumentPaginator(root, () => PAGE).paginate();

        for (const block of root.querySelectorAll<HTMLElement>('section')) {
            const top = layoutTop(block);
            const page = Math.floor(top / PAGE.height);

            expect(top + heightOf(block)).toBeLessThanOrEqual((page + 1) * PAGE.height);
        }
        const title = root.querySelectorAll<HTMLElement>('section')[4];
        expect(layoutTop(title)).toBe(2 * PAGE.height);
    });
});
