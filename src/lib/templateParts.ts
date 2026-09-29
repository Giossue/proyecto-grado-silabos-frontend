import { nodesOfType } from '@/lib/templateDocument';
import type {
    TemplateAppearance,
    TemplateContentType,
    TemplateFieldContainer,
} from '@/types/configuration';

type PageOrientation = TemplateAppearance['orientation'];

/** Nombre simple del tipo de una parte, tal como se muestra en pantalla. */
const TYPE_LABELS: Record<TemplateContentType, string> = {
    text: 'Texto',
    table: 'Tabla',
    bulleted_list: 'Lista con viñetas',
    numbered_list: 'Lista numerada',
    boolean: 'Sí/No',
    multiple_choice: 'Selección múltiple',
    institutional: 'Dato automático',
    fixed: 'Texto fijo',
    automatic: 'Sale de los documentos de la carrera',
};

/** Una parte de texto fijo la escribe Administración; el docente no la llena. */
export const isFixedPart = (block: TemplateFieldContainer): boolean =>
    block.content_type === 'fixed' ||
    (block.fields.length === 0 &&
        Boolean(block.document) &&
        nodesOfType(block.document!, 'field').length === 0 &&
        nodesOfType(block.document!, 'column').length === 0);

export const partTypeLabel = (block: TemplateFieldContainer): string =>
    isFixedPart(block) ? TYPE_LABELS.fixed : TYPE_LABELS[block.content_type];

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

/** Tipos que se eligen en una lista; el texto fijo tiene su propia opción. */
export const choosableTypes = <T extends { value: string }>(types: T[]): T[] =>
    types.filter((type) => type.value !== 'fixed');

/** Valor del selector que declara un dato nuevo de los documentos de carrera (I-151). */
export const NEW_CONCEPT = '__nuevo__';

export type PartChoice = {
    content_type: string;
    options_sources: string[];
    concept_key: string;
    concept: { label: string; type: 'texto' | 'lista'; scope: 'asignatura' | 'carrera' };
};

export const emptyPartChoice = (contentType = 'text'): PartChoice => ({
    content_type: contentType,
    options_sources: [],
    concept_key: '',
    concept: { label: '', type: 'lista', scope: 'asignatura' },
});

/** Errores de «¿Quién llena esta parte?» antes de enviar; vacío si está completa. */
export const partChoiceErrors = (choice: PartChoice): Partial<Record<'options_sources' | 'concept', string>> => {
    if (choice.content_type === 'multiple_choice' && !choice.options_sources.length) {
        return { options_sources: 'Seleccione al menos una lista con las opciones.' };
    }
    if (choice.content_type === 'automatic' && (!choice.concept_key || (choice.concept_key === NEW_CONCEPT && !choice.concept.label.trim()))) {
        return { concept: 'Elija el dato de los documentos o escriba el nombre del dato nuevo.' };
    }

    return {};
};

/** Datos que viajan a la API según quién llena la parte. */
export const partChoicePayload = (choice: PartChoice): Record<string, unknown> => ({
    content_type: choice.content_type,
    options_sources: choice.content_type === 'multiple_choice' ? choice.options_sources : [],
    ...(choice.content_type === 'automatic'
        ? choice.concept_key === NEW_CONCEPT
            ? { concept: { ...choice.concept, label: choice.concept.label.trim() } }
            : { concept_key: choice.concept_key }
        : {}),
});
