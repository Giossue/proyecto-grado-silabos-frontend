/**
 * Colores del formato académico. Son datos del documento, no colores del tema de la
 * aplicación; por eso se mantienen en un catálogo único y estable.
 */
export const DOCUMENT_COLORS = Object.freeze({
    text: '#000000',
    paper: '#FFFFFF',
    border: '#7F7F7F',
    mutedText: '#595959',
    institutionalBlue: '#0070C0',
    darkBlue: '#1F4E78',
    red: '#C00000',
    green: '#548235',
    lightBlue: '#DBE5F1',
    tableHeader: '#4F81BD',
    tableHeaderText: '#365F91',
    total: '#B8CCE4',
    lightGray: '#E7E6E6',
    fieldBackground: '#EDF6FF',
    variableBackground: '#EDF8EE',
} as const);

export const DOCUMENT_TEXT_COLORS = [
    { label: 'Negro', value: DOCUMENT_COLORS.text },
    { label: 'Azul institucional', value: DOCUMENT_COLORS.institutionalBlue },
    { label: 'Azul oscuro', value: DOCUMENT_COLORS.darkBlue },
    { label: 'Rojo', value: DOCUMENT_COLORS.red },
    { label: 'Verde', value: DOCUMENT_COLORS.green },
    { label: 'Gris', value: DOCUMENT_COLORS.mutedText },
] as const;

export const DOCUMENT_CELL_COLORS = [
    { label: 'Sin fondo', value: null },
    { label: 'Blanco', value: DOCUMENT_COLORS.paper },
    { label: 'Azul claro', value: DOCUMENT_COLORS.lightBlue },
    { label: 'Azul institucional', value: DOCUMENT_COLORS.tableHeader },
    { label: 'Gris claro', value: DOCUMENT_COLORS.lightGray },
] as const;
