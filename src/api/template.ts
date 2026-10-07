import { api } from '@/api/client';
import type { DocumentNode } from '@/lib/templateDocument';

/** Campo de la plantilla (I-195): un tipo del registro y su configuración. */
export type TemplateField = { id: string; block_id: string; key: string; label: string; help: string | null; type: string; config?: Record<string, unknown> | unknown[] | null; document?: DocumentNode | null };
export type TemplateBlock = { id: string; key: string; title: string; fields: TemplateField[] };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };
/** Diseño oficial de sección (catálogo de «Nueva sección»); `in_use` indica que la plantilla ya lo tiene. */
export type SectionDesign = { key: string; title: string; summary: string; fields: Array<{ label: string; type: string }>; in_use: boolean };
export type TemplateSectionPayload = { id: string; key: string; title: string; description: string | null; blocks: TemplateBlock[] };
export type TemplatePayload = { processLock: string | null; templateChangedDuringPause?: boolean; sectionDesigns?: SectionDesign[]; template: null | { id: string; name: string; description: string | null; titleBlock: { text: string }; sections: TemplateSectionPayload[] }; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export const getTemplate = () => api<TemplatePayload>('/admin/template');
export const createTemplate = (official = false) => api<{ message: string; template_id: string }>('/admin/template', { method: 'POST', body: JSON.stringify({ official }) });
export const formatTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/format`, { method: 'POST', body: JSON.stringify({}) });
export const uploadInstitutionLogo = (logo: File) => { const body = new FormData(); body.append('logo', logo); return api<{ message: string }>('/admin/template/logo', { method: 'POST', body }); };
