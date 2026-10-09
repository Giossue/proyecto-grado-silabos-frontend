import type { LockDetail } from '@/api/locks';
import { api } from '@/api/client';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import type { FieldResponsible } from '@/types/configuration';

export type TemplateField = { id: string; key: string; label: string; help: string | null; quien_llena: FieldResponsible; content: DocumentNode };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };

export type SectionDesign = { key: string; title: string; summary: string; fields: Array<{ label: string; quien_llena: FieldResponsible }>; in_use: boolean };
export type TemplateSectionPayload = { id: string; key: string; title: string; description: string | null; orientation: 'portrait' | 'landscape'; fields: TemplateField[] };
export type TemplatePayload = { processLock: string | null; processLockDetail?: LockDetail | null; templateChangedDuringPause?: boolean; sectionDesigns?: SectionDesign[]; variables?: TemplateVariable[]; template: null | { id: string; name: string; description: string | null; titleBlock: { text: string }; sections: TemplateSectionPayload[] }; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export const getTemplate = () => api<TemplatePayload>('/admin/template');
export const createTemplate = (official = false) => api<{ message: string; template_id: string }>('/admin/template', { method: 'POST', body: JSON.stringify({ official }) });
export const formatTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/format`, { method: 'POST', body: JSON.stringify({}) });
