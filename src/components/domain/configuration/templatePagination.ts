import { createDocumentPaginator } from '@/lib/documentPagination';

const PX_PER_MM = 96 / 25.4;
const MARGIN = 15 * PX_PER_MM;
const GAP = 16;
const PAGE = {
    portrait: { width: 210 * PX_PER_MM, height: 297 * PX_PER_MM },
    landscape: { width: 297 * PX_PER_MM, height: 210 * PX_PER_MM },
};
const BLOCKS = ':scope > header, :scope > section > h3, :scope > section > [data-section-heading], :scope > section > ol > li[data-field], :scope > section > p';

type SheetPaginator = { landscape: boolean; paginate: () => number };
const paginators = new WeakMap<HTMLElement, SheetPaginator>();

const paginatorFor = (content: HTMLElement, landscape: boolean): SheetPaginator => {
    const existing = paginators.get(content);
    if (existing) {
        existing.landscape = landscape;
        return existing;
    }
    const entry: SheetPaginator = {
        landscape,
        paginate: () => created.paginate(),
    };
    const created = createDocumentPaginator(content, () => ({ ...PAGE[entry.landscape ? 'landscape' : 'portrait'], margin: MARGIN, gap: GAP }));
    paginators.set(content, entry);
    return entry;
};

const markBlocks = (content: HTMLElement): void => {
    for (const block of content.querySelectorAll<HTMLElement>(BLOCKS)) {
        block.setAttribute('data-page-unit', '');
        if (block.matches('h3, [data-section-heading]')) block.setAttribute('data-page-keep-next', '');
        if (block.querySelector('table') && !block.querySelector('[contenteditable="true"]')) block.setAttribute('data-page-flow-through', '');
        else block.removeAttribute('data-page-flow-through');
    }
};

/**
 * Reparte el contenido de la hoja en páginas A4 con margen de 1,5 cm: lo que no cabe baja a la
 * página siguiente, las tablas pasan fila por fila y el fondo dibuja cada página separada.
 */
export const paginateSheet = (sheet: HTMLElement, landscape: boolean): void => {
    const content = sheet.querySelector<HTMLElement>(':scope > [data-sheet-content]');
    if (!content || sheet.getBoundingClientRect().width === 0) return;

    const zoom = sheet.style.zoom;
    sheet.style.zoom = '1';
    sheet.style.height = '';
    markBlocks(content);
    const pages = paginatorFor(content, landscape).paginate();
    sheet.style.zoom = zoom;

    const page = PAGE[landscape ? 'landscape' : 'portrait'].height;
    const stride = page + GAP;
    sheet.style.minHeight = '0';
    sheet.style.height = `${pages * stride - GAP}px`;
    sheet.style.backgroundColor = 'transparent';
    sheet.style.boxShadow = 'none';
    sheet.style.backgroundImage = `repeating-linear-gradient(to bottom, var(--document-paper, var(--document-sheet-paper)) 0, var(--document-paper, var(--document-sheet-paper)) ${page}px, var(--background) ${page}px, var(--background) ${stride}px)`;
};
