import { emptyValue } from '@/lib/blocks/values';
import { isChoice, optionTitle, type ChoiceSchema, type ValueSchema } from '@/lib/blocks/types';
import type { DocumentNode } from '@/lib/templateDocument';

export const RESPONSE_NODE = 'response';
export const FREE_TEXT_KIND = 'texto';
export const FREE_TEXT_LABEL = 'Texto libre';
export const RESPONSE_MAX_OPTIONS = 50;
export const RESPONSE_OPTION_LENGTH = 120;

export type ResponseOption = { const: string; title: string };
export type ResponseAttrs = { kind: string; options: ResponseOption[]; value: unknown };

const choice: ChoiceSchema = { type: 'string', oneOf: [] };

export const RESPONSE_TEXT_LENGTH = 3000;

export const RESPONSE_KINDS: Record<string, { label: string; schema: ValueSchema }> = {
    texto: { label: FREE_TEXT_LABEL, schema: { type: 'string', maxLength: RESPONSE_TEXT_LENGTH, multiline: true } },
    una: { label: 'Elegir una', schema: choice },
    varias: { label: 'Elegir varias', schema: { type: 'array', minItems: 0, maxItems: 100, initial: 0, items: choice } },
};

export const responseKindOptions = Object.entries(RESPONSE_KINDS).map(([kind, entry]) => ({ kind, label: entry.label }));

const kindSchema = (kind: string): ValueSchema | null => RESPONSE_KINDS[kind]?.schema ?? null;

export const responseHasOptions = (kind: string): boolean => {
    const schema = kindSchema(kind);
    return isChoice(schema) || (schema?.type === 'array' && isChoice(schema.items));
};

export const responseMany = (kind: string): boolean => kindSchema(kind)?.type === 'array';

export const responseSchema = (kind: string, options: ResponseOption[]): ValueSchema | null => {
    const schema = kindSchema(kind);
    if (!schema) return null;
    if (isChoice(schema)) return { ...schema, oneOf: options };
    if (schema.type === 'array' && isChoice(schema.items)) return { ...schema, items: { ...schema.items, oneOf: options } };
    return schema;
};

const emptyOf = (kind: string): unknown => {
    const schema = kindSchema(kind);
    return schema ? emptyValue(schema, {}) : null;
};

export const emptyResponse = (kind: string, options: ResponseOption[] = []): DocumentNode => ({
    type: RESPONSE_NODE,
    attrs: { kind, options: responseHasOptions(kind) ? options : [], value: emptyOf(kind) as never },
});

export const responseAttrs = (node: DocumentNode | null | undefined): ResponseAttrs => {
    const attrs = (node?.attrs ?? {}) as Record<string, unknown>;
    const kind = typeof attrs.kind === 'string' ? attrs.kind : '';
    const options = Array.isArray(attrs.options)
        ? (attrs.options as unknown[]).filter((option): option is ResponseOption => typeof option === 'object' && option !== null
            && typeof (option as ResponseOption).const === 'string' && typeof (option as ResponseOption).title === 'string')
        : [];
    return { kind, options, value: attrs.value === undefined ? emptyOf(kind) : attrs.value };
};

export const responseAnswered = (attrs: ResponseAttrs): boolean =>
    Array.isArray(attrs.value) ? attrs.value.length > 0 : attrs.value !== null && attrs.value !== undefined && attrs.value !== '';

export const responseNeedsOptions = (attrs: ResponseAttrs): boolean => responseHasOptions(attrs.kind) && attrs.options.length === 0;

export const responseLines = (attrs: ResponseAttrs): string[] => {
    if (!responseAnswered(attrs)) return [];
    if (!responseHasOptions(attrs.kind)) return [String(attrs.value)];
    const schema: ChoiceSchema = { type: 'string', oneOf: attrs.options };
    return (Array.isArray(attrs.value) ? attrs.value : [attrs.value]).map((chosen) => optionTitle(schema, chosen)).filter(Boolean);
};

export const responseLabel = (attrs: ResponseAttrs): string => {
    const label = RESPONSE_KINDS[attrs.kind]?.label ?? 'Respuesta';
    if (!responseHasOptions(attrs.kind)) return label;
    return `${label}: ${attrs.options.length ? attrs.options.map((option) => option.title).join(' · ') : 'sin opciones'}`;
};

export const nextOptionKey = (options: ResponseOption[]): string => {
    let index = options.length + 1;
    while (options.some((option) => option.const === `o${index}`)) index++;
    return `o${index}`;
};

export const withinResponse = (node: DocumentNode | null | undefined): boolean =>
    Boolean(node) && (node!.type === RESPONSE_NODE || (node!.content ?? []).some(withinResponse));
