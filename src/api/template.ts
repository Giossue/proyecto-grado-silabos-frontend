import type { SyllabusDetail } from '@/api/syllabi';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import type { LockDetail } from '@/api/locks';
import type { DocumentLayout, DocumentLayoutOptions } from '@/lib/documentLayout';
import { api } from '@/api/client';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import type { FieldResponsible } from '@/types/configuration';

export type TemplateField = { id: string; key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode };
export type TemplateAppearance = { font_family: string; body_font_size: number; title_font_size: number; section_font_size: number; field_font_size: number; text_color: string; accent_color: string; table_header_background: string; table_header_color: string; margin_cm: number; orientation: string; title_bold: boolean; title_italic: boolean; title_alignment: string; section_bold: boolean; section_italic: boolean; section_alignment: string; body_alignment: string };

export type TemplateSectionPayload = { id: string; key: string; title: string; orientation: 'portrait' | 'landscape'; fields: TemplateField[] };
export type TemplatePayload = { processLock: string | null; processLockDetail?: LockDetail | null; templateChangedDuringPause?: boolean; variables?: TemplateVariable[]; presets?: TemplatePreset[]; definition?: TemplateDefinitionPayload; template: null | { id: string; name: string; description: string | null; titleBlock: { text: string }; layout?: DocumentLayout; layoutOptions?: DocumentLayoutOptions; sections: TemplateSectionPayload[] }; logos?: { institution: string; faculty: string; institution_size: { width: number; height: number }; faculty_size: { width: number; height: number } } };
export type TemplatePreset = { key: string; field_key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode };
/** El formulario que verá el docente con la plantilla guardada (datos de muestra; nada se guarda). */
export const getTemplateTeacherPreview = (templateId: string) =>
    api<{ sections: SyllabusDetail['sections'] }>(`/admin/template/${templateId}/teacher-preview`);

export const getTemplate = () => api<TemplatePayload>('/admin/template').then((payload) => {
    setTemplateRuntime(payload.definition, Object.fromEntries((payload.variables ?? []).map((variable) => [variable.key, ''])));

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

export type TemplateVersionSummary = { id: string; number: number; saved_at: string; saved_by: string; sections: number; fields: number; current?: boolean };
export type TemplateVersionDraft = { title: string; layout: DocumentLayout; sections: Array<{ key: string; title: string; orientation: 'portrait' | 'landscape'; fields: Array<{ key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode }> }> };
export type TemplateVersionDetail = TemplateVersionSummary & { json: Record<string, unknown>; draft: TemplateVersionDraft };
export const getTemplateVersions = (templateId: string) => api<{ versions: TemplateVersionSummary[] }>(`/admin/template/${templateId}/versions`);
export const getTemplateVersion = (templateId: string, versionId: string) => api<TemplateVersionDetail>(`/admin/template/${templateId}/versions/${versionId}`);
export const getTemplateVersionComparison = (templateId: string, versionId: string) => api<{ changes: string[] }>(`/admin/template/${templateId}/versions/${versionId}/comparison`);
