import { setBlockLayouts, type BlockLayouts } from '@/lib/blockLayouts';
import type { LockDetail } from '@/api/locks';
import type { DocumentLayout, DocumentLayoutOptions } from '@/lib/documentLayout';
import { api } from '@/api/client';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import type { FieldResponsible } from '@/types/configuration';

export type TemplateField = { id: string; key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };

export type TemplateSectionPayload = { id: string; key: string; title: string; orientation: 'portrait' | 'landscape'; fields: TemplateField[] };
export type TemplatePayload = { processLock: string | null; processLockDetail?: LockDetail | null; templateChangedDuringPause?: boolean; variables?: TemplateVariable[]; presets?: TemplatePreset[]; blocks?: BlockLayouts; template: null | { id: string; name: string; description: string | null; titleBlock: { text: string }; layout?: DocumentLayout; layoutOptions?: DocumentLayoutOptions; sections: TemplateSectionPayload[] }; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export type TemplatePreset = { key: 'identificacion' | 'planificacion'; field_key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode };
export const getTemplate = () => api<TemplatePayload>('/admin/template').then((payload) => {
    setBlockLayouts(payload.blocks);

    return payload;
});
export const createTemplate = () => api<{ message: string; template_id: string }>('/admin/template', { method: 'POST', body: JSON.stringify({}) });
export const getTemplateJson = (id: string) => api<unknown>(`/admin/template/${id}/json`);
export const importTemplateJson = (id: string, body: unknown) => api<{ message: string }>(`/admin/template/${id}/json`, { method: 'PUT', body: JSON.stringify(body) });
export const uploadTemplateLogo = (id: string, file: File) => {
  const body = new FormData();
  body.append('logo', file);
  return api<{ message: string; logo: string }>(`/admin/template/${id}/logo`, { method: 'POST', body });
};
export const clearTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/structure`, { method: 'DELETE' });
export const formatTemplate = (id: string) => api<{ message: string }>(`/admin/template/${id}/format`, { method: 'POST', body: JSON.stringify({}) });
