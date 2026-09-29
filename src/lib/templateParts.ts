import { nodesOfType } from '@/lib/templateDocument';
import type {
    TemplateAppearance,
    TemplateContentType,
    TemplateFieldContainer,
} from '@/types/configuration';

type PageOrientation = TemplateAppearance['orientation'];

/** Nombre simple del tipo de una parte, tal como se muestra en pantalla. */
const TYPE_LABELS: Record<TemplateContentType, string> = {
    text: 'Párrafo',
    table: 'Tabla',
    bulleted_list: 'Lista',
    numbered_list: 'Lista numerada',
    boolean: 'Sí/No',
    multiple_choice: 'Selección múltiple',
    institutional: 'Dato automático',
    fixed: 'Texto fijo',
};

/** Una parte de texto fijo la escribe Administración; el docente no la llena. */
export const isFixedPart = (block: TemplateFieldContainer): boolean =>
    block.content_type === 'fixed' ||
    (block.fields.length === 0 &&
        Boolean(block.document) &&
        nodesOfType(block.document!, 'field').length === 0);

/**
 * Forma con la que se creó la parte; no cambia después (I-155, I-156). Una parte con
 * hoja propia es Texto libre si solo lleva el espacio del docente; si no, Contenido de
 * la plantilla.
 */
export const partFormLabel = (block: TemplateFieldContainer): string => {
    if (block.fields.some((field) => field.type === 'texto_libre')) {
        return 'Texto libre';
    }

    return block.document && ['text', 'fixed'].includes(block.content_type)
        ? 'Contenido de la plantilla'
        : TYPE_LABELS[block.content_type];
};

/**
 * Orientación de la hoja de una sección. Igual que el documento Word: manda la
 * primera parte que pida una orientación; si ninguna lo pide, la del documento.
 */
export const sectionOrientation = (
    blocks: TemplateFieldContainer[],
    fallback: PageOrientation,
): PageOrientation =>
    blocks.find(
        (block) =>
            block.page_orientation === 'landscape' ||
            block.page_orientation === 'portrait',
    )?.page_orientation ?? fallback;
