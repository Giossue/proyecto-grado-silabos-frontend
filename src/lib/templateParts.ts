import { nodesOfType } from '@/lib/templateDocument';
import type {
    TemplateAppearance,
    TemplateContentType,
    TemplateFieldContainer,
} from '@/types/configuration';

type PageOrientation = TemplateAppearance['orientation'];

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

export const isFixedPart = (block: TemplateFieldContainer): boolean =>
    block.content_type === 'fixed' ||
    (block.fields.length === 0 &&
        Boolean(block.document) &&
        nodesOfType(block.document!, 'field').length === 0);

export const partFormLabel = (block: TemplateFieldContainer): string => {
    if (block.fields.some((field) => field.type === 'texto_libre')) {
        return 'Texto libre';
    }

    return block.document && ['text', 'fixed'].includes(block.content_type)
        ? 'Contenido de la plantilla'
        : TYPE_LABELS[block.content_type];
};

export const sectionOrientation = (
    blocks: TemplateFieldContainer[],
    fallback: PageOrientation,
): PageOrientation =>
    blocks.find(
        (block) =>
            block.page_orientation === 'landscape' ||
            block.page_orientation === 'portrait',
    )?.page_orientation ?? fallback;
