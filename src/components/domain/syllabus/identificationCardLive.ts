import { freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import type { DocumentNode } from '@/lib/templateDocument';

export type DisabilityInputs = { has: boolean; type: string; description: string };

const LABELS = { type: 'Tipo de discapacidad:', description: 'Breve descripción:' } as const;

/** Copia del texto de una celda con el mismo estilo (marcas) del primer texto que tenía. */
const withText = (cell: DocumentNode, text: string): DocumentNode => {
    const marks = (cell.content ?? []).flatMap((paragraph) => paragraph.content ?? []).find((node) => node.type === 'text')?.marks;
    const paragraph = (cell.content ?? [])[0];

    return {
        ...cell,
        content: [{ ...(paragraph ?? { type: 'paragraph' }), content: text === '' ? [] : [{ type: 'text', text, ...(marks ? { marks } : {}) }] }],
    };
};

/**
 * Pinta en la tabla de identificación, mientras el docente escribe, la respuesta sobre estudiantes
 * con discapacidad: la X en Sí o No, el tipo y la breve descripción.
 */
export const withDisability = (document: DocumentNode, inputs: DisabilityInputs): DocumentNode => {
    const visit = (node: DocumentNode): DocumentNode => {
        if (node.type !== 'tableRow') return { ...node, ...(node.content ? { content: node.content.map(visit) } : {}) };
        const cells = [...(node.content ?? [])];
        cells.forEach((cell, index) => {
            const text = freeTextPlain(cell).trim();
            if ((text === 'Sí' || text === 'No') && cells[index + 1]) {
                cells[index + 1] = withText(cells[index + 1]!, (text === 'Sí') === inputs.has ? 'X' : '');
            } else if (text.startsWith(LABELS.type)) {
                cells[index] = withText(cell, `${LABELS.type} ${inputs.has ? inputs.type : ''}`.trim());
            } else if (text.startsWith(LABELS.description)) {
                cells[index] = withText(cell, `${LABELS.description} ${inputs.has ? inputs.description : ''}`.trim());
            }
        });

        return { ...node, content: cells };
    };

    return visit(document);
};
