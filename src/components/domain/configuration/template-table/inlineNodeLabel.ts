import { isSignatureVariable } from '@/lib/signatureVariables';

export const PROJECT_PREFIX = 'curricular_';

export type SheetMark = 'automatic' | 'teacher' | 'yesNo' | 'project' | 'signature';

const isYesNo = (attrs: Record<string, unknown>): boolean =>
    attrs.kind === 'seleccion_unica' &&
    Array.isArray(attrs.options) &&
    attrs.options.map(String).join('|') === 'Sí|No';

export const sheetMark = (name: string, attrs: Record<string, unknown>): SheetMark =>
    name !== 'variable'
        ? isYesNo(attrs) && !attrs.choice
            ? 'yesNo'
            : 'teacher'
        : String(attrs.id ?? '').startsWith(PROJECT_PREFIX)
          ? 'project'
          : isSignatureVariable(String(attrs.id ?? ''))
            ? 'signature'
            : 'automatic';

export const markClass: Record<SheetMark, string> = {
    automatic: 'template-table-variable',
    teacher: 'template-table-field',
    yesNo: 'template-table-yes-no',
    project: 'template-table-project',
    signature: 'template-table-signature',
};

export const SHEET_MARK_HINTS: Record<SheetMark, string> = {
    automatic: 'lo pone el sistema',
    teacher: 'lo escribe el docente',
    yesNo: 'el docente responde Sí o No',
    project: 'lo llena Coordinación al importar sus documentos',
    signature: 'espacio para la firma electrónica',
};

export const inlineNodeName = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name === 'variable') {
        const id = String(attrs.id ?? '');
        const label = String(attrs.label ?? '');

        return variableLabel?.(id) ?? (label !== '' && label !== id ? label : '');
    }

    return String(attrs.label || attrs.key || '');
};

export const choiceHint = (attrs: Record<string, unknown>): string =>
    `Se marca con X si el docente responde ${String(attrs.choice)} en «${String(attrs.label || attrs.key || '')}»`;

export const inlineNodeLabel = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name !== 'variable' && attrs.choice) return 'X';

    return {
        automatic: () => inlineNodeName(name, attrs, variableLabel),
        teacher: () => 'Docente',
        yesNo: () => 'Docente: Sí o No',
        project: () => 'Proyecto de carrera',
        signature: () => inlineNodeName(name, attrs, variableLabel) || 'Firma',
    }[sheetMark(name, attrs)]();
};
