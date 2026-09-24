import { h } from 'vue';
import type { CSSProperties, VNodeChild } from 'vue';
import type { TableRowData } from '@/lib/tableLayout';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import { DOCUMENT_COLORS } from '@/lib/documentPalette';

export type Row = { id: string | null; data: TableRowData };
export type Context = {
    field?: DocumentField;
    row?: Row;
    unit?: number;
    role?: string;
    totals?: TableRowData;
    insideCell?: boolean;
    cellTextAlign?: string;
};

export const textFragments = (
    text: string,
    attributes: Record<string, unknown> = {},
): VNodeChild[] =>
    (text.match(/\S+[ \t]*|[ \t]+|(?:\r\n|\r|\n)/g) ?? [text]).map(
        (fragment, index) =>
            /^(?:\r\n|\r|\n)$/.test(fragment)
                ? h('br', {
                      ...attributes,
                      key: index,
                      'data-page-fragment': '',
                  })
                : h(
                      'span',
                      {
                          ...attributes,
                          key: index,
                          'data-page-fragment': '',
                      },
                      fragment,
                  ),
    );
export const columnGroup = (table: DocumentNode): VNodeChild => {
    const occupied: boolean[][] = [];
    const widths: number[] = [];

    for (const [y, row] of (table.content ?? []).entries()) {
        let x = 0;

        for (const cell of row.content ?? []) {
            while (occupied[y]?.[x]) {
                x++;
            }

            const span = Number(cell.attrs?.colspan ?? 1);
            const height = Number(cell.attrs?.rowspan ?? 1);
            const values = Array.isArray(cell.attrs?.colwidth)
                ? cell.attrs.colwidth
                : [];

            for (let column = 0; column < span; column++) {
                if (values[column]) {
                    widths[x + column] = Number(values[column]);
                } else {
                    widths[x + column] ??= 0;
                }

                for (let r = y; r < y + height; r++) {
                    occupied[r] ??= [];
                    occupied[r][x + column] = true;
                }
            }

            x += span;
        }
    }

    const resolved = widths.map(
        (width) => width || 600 / Math.max(1, widths.length),
    );
    const total = resolved.reduce((sum, width) => sum + width, 0);

    return h(
        'colgroup',
        {},
        resolved.map((width) =>
            h('col', { style: { width: `${(width / total) * 100}%` } }),
        ),
    );
};
export const markStyle = (
    node: DocumentNode,
    inheritTableTypography = false,
): CSSProperties => {
    const style: CSSProperties = {};

    for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') {
            style.fontWeight = 'bold';
        }

        if (mark.type === 'italic') {
            style.fontStyle = 'italic';
        }

        if (mark.type === 'underline') {
            style.textDecoration = 'underline';
        }

        if (mark.type === 'textStyle') {
            const attrs = mark.attrs ?? {};

            if (attrs.fontFamily && !inheritTableTypography) {
                style.fontFamily = attrs.fontFamily;
            }

            if (attrs.color) {
                style.color = attrs.color;
            }
        }
    }

    return style;
};
export const cellBorder = (value: unknown): string | undefined => {
    if (value === 'none') {
        return '0';
    }

    if (value === 'thick') {
        return `2px solid ${DOCUMENT_COLORS.tableBorder}`;
    }

    return value === 'thin'
        ? `1px solid ${DOCUMENT_COLORS.tableBorder}`
        : undefined;
};
