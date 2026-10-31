import { api } from '@/api/client';
import type { TemplateSectionPayload } from '@/api/template';
import type { DocumentNode } from '@/lib/templateDocument';
import type { FieldResponsible } from '@/types/configuration';

export type TemplateProposalStatus = 'pendiente' | 'aplicada' | 'descartada' | 'vencida' | 'reemplazada';

export type TemplateAssistantMessage = {
    id: string;
    role: 'usuario' | 'asistente';
    status: 'pendiente' | 'en_ejecucion' | 'completado' | 'fallido';
    result: 'propuesta' | 'respuesta' | 'pregunta' | 'fallido' | null;
    content: string;
    error: string | null;
    created_at: string;
    proposal: { id: string; status: TemplateProposalStatus; changes: string[] } | null;
};

export type TemplateAssistantChat = {
    available: boolean;
    locked: boolean;
    suggestions: string[];
    messages: TemplateAssistantMessage[];
};

export type TemplateAssistantProposal = {
    id: string;
    status: TemplateProposalStatus;
    changes: string[];
    changed: { sections: string[]; fields: string[] };
    sections: Array<{
        key: string;
        title: string;
        orientation: 'portrait' | 'landscape';
        fields: Array<{ key: string; label: string; quien_llena: FieldResponsible; content: DocumentNode }>;
    }>;
};

export type TemplateProposalPreview = {
    id: string;
    sections: TemplateSectionPayload[];
    changedSections: string[];
    changedFields: string[];
};

export const getTemplateAssistant = () => api<TemplateAssistantChat>('/admin/template/assistant');
export const sendTemplateAssistantMessage = (message: string, idempotencyKey: string = crypto.randomUUID()) =>
    api<{ message: string; assistant_message_id: string }>('/admin/template/assistant/messages', {
        method: 'POST',
        body: JSON.stringify({ message, idempotency_key: idempotencyKey }),
    });
export const clearTemplateAssistant = () => api<{ message: string }>('/admin/template/assistant', { method: 'DELETE' });
export const getTemplateAssistantProposal = (id: string) => api<TemplateAssistantProposal>(`/admin/template/assistant/proposals/${id}`);
export const applyTemplateAssistantProposal = (id: string) =>
    api<{ message: string }>(`/admin/template/assistant/proposals/${id}/apply`, { method: 'POST', body: JSON.stringify({}) });
export const discardTemplateAssistantProposal = (id: string) =>
    api<{ message: string }>(`/admin/template/assistant/proposals/${id}/discard`, { method: 'POST', body: JSON.stringify({}) });

export const proposalPreview = (proposal: TemplateAssistantProposal): TemplateProposalPreview => ({
    id: proposal.id,
    sections: proposal.sections.map((section) => ({
        id: `propuesta-${section.key}`,
        key: section.key,
        title: section.title,
        orientation: section.orientation,
        fields: section.fields.map((field) => ({ id: `propuesta-${field.key}`, key: field.key, label: field.label, quien_llena: field.quien_llena, content: field.content })),
    })),
    changedSections: proposal.changed.sections,
    changedFields: proposal.changed.fields,
});
