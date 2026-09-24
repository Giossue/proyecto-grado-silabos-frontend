/** Texto visible de una ficha dentro de la celda: siempre un nombre, nunca una clave. */
export const inlineNodeLabel = (
    name: string,
    attrs: Record<string, unknown>,
    variableLabel?: (id: string) => string | undefined,
): string => {
    if (name === 'variable') {
        const id = String(attrs.id ?? '');
        const label = String(attrs.label ?? '');

        return (
            variableLabel?.(id) ??
            (label !== '' && label !== id ? label : 'Dato automático')
        );
    }

    if (name === 'column') {
        return String(attrs.label || attrs.key || '');
    }

    return attrs.choice
        ? `X si ${String(attrs.label)} = ${String(attrs.choice)}`
        : String(attrs.label ?? '');
};
