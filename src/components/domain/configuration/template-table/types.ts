export type CellAlignment = 'left' | 'center' | 'right' | 'justify';
export type CellBorder = 'thin' | 'thick' | 'none';
export type CellAttributes = {
    backgroundColor?: string | null;
    textColor?: string | null;
    textAlign?: CellAlignment | null;
    bold?: boolean | null;
    italic?: boolean | null;
    borderStyle?: CellBorder | null;
};
