/** Prefijo de los datos del Proyecto de carrera en el catálogo de variables (I-155). */
export const PROJECT_PREFIX = 'curricular_';

export type SheetMark = 'automatic' | 'teacher' | 'yesNo' | 'project';

const isYesNo = (attrs: Record<string, unknown>): boolean =>
    attrs.kind === 'seleccion_unica' &&
    Array.isArray(attrs.options) &&
    attrs.options.map(String).join('|') === 'Sí|No';

/**
 * Marcas de la hoja (I-155): dato automático, Docente (lo escribe el docente), Docente:
 * Sí o No y Proyecto de carrera (lo llena Coordinación al importar). Se insertan solo
 * desde Insertar de la cinta; en la ficha se ve el tipo y su color, sin símbolos.
 */
export const sheetMark = (name: string, attrs: Record<string, unknown>): SheetMark =>
    name !== 'variable'
        ? isYesNo(attrs) && !attrs.choice
            ? 'yesNo'
            : 'teacher'
        : String(attrs.id ?? '').startsWith(PROJECT_PREFIX)
          ? 'project'
          : 'automatic';

export const markClass: Record<SheetMark, string> = {
    automatic: 'template-table-variable',
    teacher: 'template-table-field',
    yesNo: 'template-table-yes-no',
    project: 'template-table-project',
};

export const SHEET_MARK_HINTS: Record<SheetMark, string> = {
    automatic: 'lo pone el sistema',
    teacher: 'lo escribe el docente',
    yesNo: 'el docente responde Sí o No',
    project: 'lo llena Coordinación al importar sus documentos',
};

/** Nombre interno de la ficha: el del dato o de la pregunta, nunca una clave. */
export const inlineNodeName = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name === 'variable') {
        const id = String(attrs.id ?? '');
        const label = String(attrs.label ?? '');

        // Sin nombre conocido queda vacío: nunca una clave ni un rótulo genérico.
        return variableLabel?.(id) ?? (label !== '' && label !== id ? label : '');
    }

    return String(attrs.label || attrs.key || '');
};

/** Texto visible de la ficha en la hoja. */
export const inlineNodeLabel = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name !== 'variable' && attrs.choice) {
        return `X si ${String(attrs.label)} = ${String(attrs.choice)}`;
    }

    return {
        automatic: () => inlineNodeName(name, attrs, variableLabel),
        teacher: () => 'Docente',
        yesNo: () => 'Docente: Sí o No',
        project: () => 'Proyecto de carrera',
    }[sheetMark(name, attrs)]();
};
