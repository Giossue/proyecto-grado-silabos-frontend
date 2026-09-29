import { api } from '@/api/client';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

export type TemplateContentType = "text" | "table" | "bulleted_list" | "numbered_list" | "boolean" | "multiple_choice" | "institutional" | "fixed";
export const pageOrientationPayload = (landscape: boolean): { page_orientation: 'portrait' | 'landscape' } => ({
  page_orientation: landscape ? 'landscape' : 'portrait',
});
export type TemplateChoice = { value: string; label: string };
export type TemplateField = { id: string; block_id: string; key: string; label: string; help: string | null; type: string; options: TemplateChoice[]; options_source?: string | null; options_sources?: string[]; show_when?: { key: string; value: string } | null; required: boolean; inherited: boolean; master_source: string | null; teacher_editable: boolean; document_marker?: string | null; content_type: TemplateContentType };
export type TemplateFieldDraft = { key: string; label: string; help: string; content_type: TemplateContentType; options: TemplateChoice[] };
export type TemplateBlock = { id: string; key: string; title: string; type: string; content_type: TemplateContentType; page_orientation?: 'portrait' | 'landscape' | null; document: DocumentNode | null; fingerprint: string; fields: TemplateField[] };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };
export type TemplateOption = { value: string | number; label: string };
export type TemplatePayload = { processLock: string | null; template: null | { id: string; name: string; description: string | null; appearance: TemplateAppearance; titleBlock: { text: string }; sections: Array<{ id: string; key: string; title: string; description: string | null; blocks: TemplateBlock[] }> }; identificationSample?: unknown[][]; blockTypes?: Array<{ value: 'free_text' | 'template'; label: string }>; appearanceOptions?: { fonts: TemplateOption[]; body_sizes: TemplateOption[]; title_sizes: TemplateOption[]; section_sizes: TemplateOption[]; field_sizes: TemplateOption[]; margins: TemplateOption[]; colors: TemplateOption[]; alignments: TemplateOption[]; orientations: TemplateOption[] }; variables?: TemplateVariable[]; identificationDesign?: DocumentNode; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export type NewProjectData = { label: string; type: 'texto' | 'lista' };
export const declareProjectData = (templateId: string, input: NewProjectData) =>
  api<{ message: string; variable: TemplateVariable }>(`/admin/template/${templateId}/project-data`, { method: 'POST', body: JSON.stringify(input) });
export const getTemplate = () => api<TemplatePayload>('/admin/template');
export const createTemplate = () => api<{ message: string; template_id: string }>('/admin/template', { method: 'POST', body: JSON.stringify({}) });
export const formatTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/format`, { method: 'POST', body: JSON.stringify({}) });
export const uploadInstitutionLogo = (logo: File) => { const body = new FormData(); body.append('logo', logo); return api<{ message: string }>('/admin/template/logo', { method: 'POST', body }); };
