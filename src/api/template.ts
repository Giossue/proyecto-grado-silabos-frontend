import { api } from '@/api/client';
import type { DocumentNode } from '@/lib/templateDocument';

/** Campo de la plantilla (I-195): un tipo del registro y su configuración. */
export type TemplateField = { id: string; block_id: string; key: string; label: string; help: string | null; type: string; config?: Record<string, unknown> | unknown[] | null; document?: DocumentNode | null };
export type TemplateBlock = { id: string; key: string; title: string; fields: TemplateField[] };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };
export type TemplateSectionPayload = { id: string; key: string; title: string; description: string | null; blocks: TemplateBlock[] };
export type TemplatePayload = { processLock: string | null; templateChangedDuringPause?: boolean; template: null | { id: string; name: string; description: string | null; titleBlock: { text: string }; sections: TemplateSectionPayload[] }; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export const getTemplate = () => api<TemplatePayload>('/admin/template');
export const createTemplate = () => api<{ message: string; template_id: string }>('/admin/template', { method: 'POST', body: JSON.stringify({}) });
export const formatTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/format`, { method: 'POST', body: JSON.stringify({}) });
export const uploadInstitutionLogo = (logo: File) => { const body = new FormData(); body.append('logo', logo); return api<{ message: string }>('/admin/template/logo', { method: 'POST', body }); };
