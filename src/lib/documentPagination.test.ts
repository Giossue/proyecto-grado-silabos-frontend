import { afterEach, describe, expect, it } from 'vitest';
import { createDocumentPaginator } from '@/lib/documentPagination';

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
});
