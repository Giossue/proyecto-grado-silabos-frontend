import type { DocumentField } from '@/lib/templateDocument';

export const templatePreviewFields = (fields: DocumentField[]): DocumentField[] =>
    fields.map((field) => ({ ...field, value: null }));
