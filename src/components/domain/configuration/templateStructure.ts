import { fieldTypeEntry, fieldTypeRegistry } from '@/components/domain/fieldTypes/registry';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { ApiError } from '@/api/client';
import type { FieldInput } from '@/api/template-structure';
import type { TemplateField } from '@/api/template';
import type { FieldTypeKey } from '@/types/configuration';

export type FieldForm = { type: FieldTypeKey; label: string; help: string; config: Record<string, unknown> };

/** Clave técnica (`a-z0-9_`) a partir de un nombre; distinta de las ya usadas. */
export const uniqueKey = (name: string, fallback: string, used: Iterable<string>): string => {
    const taken = new Set(used);
    const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9]+/, '').slice(0, 80) || fallback);
    let key = base;
    for (let n = 2; taken.has(key); n += 1) key = `${base}_${n}`;
    return key;
};

export const newFieldForm = (type: FieldTypeKey = 'texto'): FieldForm => ({
    type,
    label: '',
    help: '',
    config: structuredClone(fieldTypeRegistry[type].defaultConfig) as Record<string, unknown>,
});

export const formFromField = (field: TemplateField): FieldForm => {
    const entry = fieldTypeEntry(field.type);
    return {
        type: (entry ? field.type : 'texto') as FieldTypeKey,
        label: field.label,
        help: field.help ?? '',
        config: structuredClone({ ...(entry?.defaultConfig ?? {}), ...fieldConfig(field) }) as Record<string, unknown>,
    };
};

export const fieldFormError = (form: FieldForm): string | null => fieldTypeRegistry[form.type].validateConfig(form.config);

export const fieldInput = (form: FieldForm): FieldInput => ({
    label: form.label.trim(),
    help: form.help.trim() === '' ? null : form.help.trim(),
    config: form.config,
});

/** Primer mensaje legible de un error de la API (incluye `config.*` de la configuración del tipo). */
export const apiMessage = (reason: unknown, fallback: string): string => {
    if (reason instanceof ApiError) return Object.values(reason.errors)[0]?.[0] ?? reason.message;
    return fallback;
};
