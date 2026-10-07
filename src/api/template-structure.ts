import { api } from '@/api/client';

/** API simplificada de estructura de la plantilla (I-195): secciones y campos con tipo y configuración. */
const base = (template: string): string => `/admin/template/${template}/structure`;
const json = (method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): RequestInit => ({
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export type FieldInput = {
    key?: string;
    label: string;
    help?: string | null;
    type?: string;
    config?: Record<string, unknown>;
};

export const createSection = (template: string, input: { key: string; title: string }) =>
    api<{ message: string; section_id: string }>(`${base(template)}/sections`, json('POST', input));
export const renameSection = (template: string, section: string, title: string) =>
    api<{ message: string }>(`${base(template)}/sections/${section}`, json('PATCH', { title }));
export const deleteSection = (template: string, section: string) =>
    api<{ message: string }>(`${base(template)}/sections/${section}`, json('DELETE'));
export const reorderSections = (template: string, ids: string[]) =>
    api<{ message: string }>(`${base(template)}/sections/order`, json('PATCH', { section_ids: ids }));

export const createField = (template: string, section: string, input: FieldInput) =>
    api<{ message: string }>(`${base(template)}/sections/${section}/fields`, json('POST', input));
export const updateField = (template: string, field: string, input: Omit<FieldInput, 'key' | 'type'>) =>
    api<{ message: string }>(`${base(template)}/fields/${field}`, json('PATCH', input));
export const deleteField = (template: string, field: string) =>
    api<{ message: string }>(`${base(template)}/fields/${field}`, json('DELETE'));
export const reorderFields = (template: string, section: string, ids: string[]) =>
    api<{ message: string }>(`${base(template)}/sections/${section}/fields/order`, json('PATCH', { field_ids: ids }));
