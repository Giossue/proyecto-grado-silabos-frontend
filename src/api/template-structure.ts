import { api } from '@/api/client';
import type { FieldResponsible } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

export type FieldInput = {
    key?: string;
    label: string;
    help?: string | null;
    quien_llena: FieldResponsible;
    content: DocumentNode;
};

export const createSection = (template: string, input: { key: string; title: string; orientation?: 'portrait' | 'landscape' }) =>
    api<{ message: string; section_id: string }>(`/admin/template/${template}/structure/sections`, { method: 'POST', body: JSON.stringify(input) });
export const createSectionFromDesign = (template: string, design: string) =>
    api<{ message: string; section_id: string }>(`/admin/template/${template}/structure/sections`, { method: 'POST', body: JSON.stringify({ design }) });
export const renameSection = (template: string, section: string, title: string, orientation?: 'portrait' | 'landscape') =>
    api<{ message: string }>(`/admin/template/${template}/structure/sections/${section}`, { method: 'PATCH', body: JSON.stringify({ title, orientation }) });
export const deleteSection = (template: string, section: string) =>
    api<{ message: string }>(`/admin/template/${template}/structure/sections/${section}`, { method: 'DELETE' });
export const reorderSections = (template: string, ids: string[]) =>
    api<{ message: string }>(`/admin/template/${template}/structure/sections/order`, { method: 'PATCH', body: JSON.stringify({ section_ids: ids }) });

export const createField = (template: string, section: string, input: FieldInput) =>
    api<{ message: string; field?: { id?: string } }>(`/admin/template/${template}/structure/sections/${section}/fields`, { method: 'POST', body: JSON.stringify(input) });
export const updateField = (template: string, field: string, input: Omit<FieldInput, 'key'>) =>
    api<{ message: string }>(`/admin/template/${template}/structure/fields/${field}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteField = (template: string, field: string) =>
    api<{ message: string }>(`/admin/template/${template}/structure/fields/${field}`, { method: 'DELETE' });
export const reorderFields = (template: string, section: string, ids: string[]) =>
    api<{ message: string }>(`/admin/template/${template}/structure/sections/${section}/fields/order`, { method: 'PATCH', body: JSON.stringify({ field_ids: ids }) });
