import type { DocumentNode } from '@/lib/templateDocument';

export const BIBLIOGRAPHY_COLUMNS = ['Autor', 'Título', 'Año', 'Ciudad', 'Editorial', 'ISBN', 'Código'] as const;

/** Los campos de bibliografía se llenan como tabla, con una columna por dato del libro. */
export const isBibliographyField = (key: string | undefined): boolean => Boolean(key?.startsWith('bibliografia'));

const cell = (type: 'tableHeader' | 'tableCell', text = ''): DocumentNode => ({
    type,
    attrs: { colspan: 1, rowspan: 1 },
    content: [text === '' ? { type: 'paragraph' } : { type: 'paragraph', content: [{ type: 'text', text }] }],
});

/** Tabla vacía con los encabezados de la bibliografía y una fila para empezar a escribir. */
export const emptyBibliography = (): DocumentNode => ({
    type: 'doc',
    content: [{
        type: 'table',
        content: [
            { type: 'tableRow', content: BIBLIOGRAPHY_COLUMNS.map((column) => cell('tableHeader', column)) },
            { type: 'tableRow', content: BIBLIOGRAPHY_COLUMNS.map(() => cell('tableCell')) },
        ],
    }],
});
