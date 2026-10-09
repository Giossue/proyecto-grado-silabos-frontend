import { ApiError } from '@/api/client';
import type { FieldInput } from '@/api/template-structure';
import type { TemplateField } from '@/api/template';
import { emptyDocument, type FieldResponsible } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

export type FieldForm = { quien_llena: FieldResponsible; label: string; help: string; content: DocumentNode };


export const uniqueKey = (name: string, fallback: string, used: Iterable<string>): string => {
    const taken = new Set(used);
    const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9]+/, '').slice(0, 80) || fallback);
    let key = base;
    for (let n = 2; taken.has(key); n += 1) key = `${base}_${n}`;
    return key;
};

export const newFieldForm = (): FieldForm => ({ quien_llena: 'docente', label: '', help: '', content: emptyDocument() });
export const formFromField = (field: TemplateField): FieldForm => ({
    quien_llena: field.quien_llena,
    label: field.label,
    help: field.help ?? '',
    content: JSON.parse(JSON.stringify(field.content)) as DocumentNode,
});
export const fieldInput = (form: FieldForm): FieldInput => ({
    label: form.label.trim(),
    help: form.help.trim() === '' ? null : form.help.trim(),
    quien_llena: form.quien_llena,
    content: form.content,
});


export const apiMessage = (reason: unknown, fallback: string): string => {
    if (reason instanceof ApiError) return Object.values(reason.errors)[0]?.[0] ?? reason.message;
    return fallback;
};
