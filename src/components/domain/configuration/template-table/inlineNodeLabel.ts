/** Prefijo de los datos del Proyecto de carrera en el catálogo de variables (I-155). */
export const PROJECT_PREFIX = 'curricular_';

export type SheetMark = 'automatic' | 'teacher' | 'project';

/**
 * Tres marcas en la hoja (I-155): dato automático, !Docente (lo llena el docente) y
 * @ProyectoCarrera (lo llena Coordinación al importar sus documentos).
 */
export const sheetMark = (name: string, attrs: Record<string, unknown>): SheetMark =>
    name !== 'variable'
        ? 'teacher'
        : String(attrs.id ?? '').startsWith(PROJECT_PREFIX)
          ? 'project'
          : 'automatic';

export const markClass: Record<SheetMark, string> = {
    automatic: 'template-table-variable',
    teacher: 'template-table-field',
    project: 'template-table-project',
};

export const SHEET_MARK_HINTS: Record<SheetMark, string> = {
    automatic: 'Dato automático: lo pone el sistema.',
    teacher: '!Docente: lo llena el docente.',
    project: '@ProyectoCarrera: lo llena Coordinación al importar sus documentos.',
};

/** Texto visible de una ficha dentro de la celda: siempre un nombre, nunca una clave. */
export const inlineNodeLabel = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name === 'variable') {
        const id = String(attrs.id ?? '');
        const label = String(attrs.label ?? '');
        // Sin nombre conocido la ficha queda vacía: nunca una clave ni un rótulo genérico.
        const shown = variableLabel?.(id) ?? (label !== '' && label !== id ? label : '');

        return shown !== '' && id.startsWith(PROJECT_PREFIX) ? `@${shown}` : shown;
    }

    if (name === 'column') {
        return `!${String(attrs.label || attrs.key || '')}`;
    }

    return attrs.choice
        ? `X si ${String(attrs.label)} = ${String(attrs.choice)}`
        : `!${String(attrs.label ?? '')}`;
};
