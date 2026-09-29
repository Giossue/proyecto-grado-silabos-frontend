export type ShowWhen = { key: string; value: string } | null;

type Choice = { value: string; label: string };
type ConditionField = {
    key: string;
    type?: string;
    value?: unknown;
    options?: Choice[];
    show_when?: ShowWhen;
};

export const CHOICE_TYPES = ['seleccion_unica', 'booleano'];

export const isChoiceField = (field: { type?: string }): boolean =>
    CHOICE_TYPES.includes(field.type ?? '');

const conditionText = (value: unknown): string =>
    typeof value === 'boolean'
        ? String(value)
        : typeof value === 'string' || typeof value === 'number'
          ? String(value).trim()
          : '';

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
