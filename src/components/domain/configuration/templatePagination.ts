/** Medidas de una hoja A4 a 96 ppp: alto de la página, margen de 2,5 cm y separación entre páginas. */
const PX_PER_MM = 96 / 25.4;
const MARGIN = 25 * PX_PER_MM;
const GAP = 16;
const PAGE = { portrait: 297 * PX_PER_MM, landscape: 210 * PX_PER_MM };
const WIDTH = { portrait: 210 * PX_PER_MM, landscape: 297 * PX_PER_MM };
const BLOCKS = ':scope > header, :scope > section > h3, [data-section-heading], [data-field], :scope > section > p';

/**
 * Reparte el contenido de la hoja en páginas A4: un bloque que no cabe en lo que queda de la
 * página baja a la siguiente, y el fondo dibuja cada página separada. Los bloques más altos que
 * una página (tablas grandes) se dejan cruzar el salto.
 */
export const paginateSheet = (sheet: HTMLElement, landscape: boolean): void => {
    const blocks = [...sheet.querySelectorAll<HTMLElement>(BLOCKS)];
    for (const block of blocks) block.style.marginTop = '';
    const rect = sheet.getBoundingClientRect();
    if (rect.width === 0) return;

    const scale = rect.width / (landscape ? WIDTH.landscape : WIDTH.portrait);
    const page = landscape ? PAGE.landscape : PAGE.portrait;
    const stride = page + GAP;
    const usable = page - 2 * MARGIN;
    let bottom = 0;
    for (const block of blocks) {
        const box = block.getBoundingClientRect();
        const top = (box.top - sheet.getBoundingClientRect().top) / scale;
        const height = box.height / scale;
        const index = Math.floor(top / stride);
        const contentTop = index * stride + MARGIN;
        const contentBottom = index * stride + page - MARGIN;
        let shift = 0;
        if (top < contentTop) shift = contentTop - top;
        else if (top + height > contentBottom && height <= usable) shift = (index + 1) * stride + MARGIN - top;
        if (shift > 0) block.style.marginTop = `${shift}px`;
        bottom = Math.max(bottom, top + shift + height);
    }

    const pages = Math.max(1, Math.ceil((bottom + MARGIN) / stride));
    sheet.style.minHeight = `${pages * stride - GAP}px`;
    sheet.style.backgroundColor = 'transparent';
    sheet.style.boxShadow = 'none';
    sheet.style.backgroundImage = `repeating-linear-gradient(to bottom, var(--document-paper, var(--document-sheet-paper)) 0, var(--document-paper, var(--document-sheet-paper)) ${page}px, var(--background) ${page}px, var(--background) ${stride}px)`;
};
