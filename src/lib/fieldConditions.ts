/**
 * «Mostrar solo si»: una parte del docente depende de otra parte Sí/No o de
 * selección (una sola condición). Mientras no se cumple, la parte se oculta y no se
 * pide; su valor guardado no se borra. Es el mismo criterio del servidor
 * (FieldConditions.php).
 */
export type ShowWhen = { key: string; value: string } | null;

type Choice = { value: string; label: string };
type ConditionField = {
    key: string;
    type?: string;
    value?: unknown;
    options?: Choice[];
    show_when?: ShowWhen;
};

/** Tipos de parte que pueden servir de condición. */
export const CHOICE_TYPES = ['seleccion_unica', 'booleano'];

export const isChoiceField = (field: { type?: string }): boolean =>
    CHOICE_TYPES.includes(field.type ?? '');

const conditionText = (value: unknown): string =>
    typeof value === 'boolean'
        ? String(value)
        : typeof value === 'string' || typeof value === 'number'
          ? String(value).trim()
          : '';

/**
 * Claves de las partes ocultas con los valores actuales. Una condición que apunta a
 * una parte que ya no existe o que no es de selección no oculta nada.
 */
export const hiddenKeys = (fields: ConditionField[]): Set<string> => {
    const byKey = new Map(fields.map((field) => [field.key, field]));
    const hidden = new Set<string>();

    for (const field of fields) {
        const condition = field.show_when;
        const target = condition ? byKey.get(condition.key) : undefined;

        if (
            condition &&
            target &&
            isChoiceField(target) &&
            conditionText(target.value) !== condition.value
        ) {
            hidden.add(field.key);
        }
    }

    return hidden;
};
