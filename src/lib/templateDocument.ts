
export type DocumentNode = {
    type: string;
    text?: string;
    attrs?: Record<
        string,
        string | number | boolean | null | number[] | string[]
    >;
    marks?: { type: string; attrs?: Record<string, string | null> }[];
    content?: DocumentNode[];
};
export type TemplateVariable = { key: string; label: string; sample: string; type?: 'texto' | 'lista' | 'tabla' };
export type DocumentField = {
    id?: string;
    key: string;
    label: string;
    type?: string;
    value?: unknown;
    options?: { value: string; label: string }[];
    inherited?: boolean;
    teacher_editable?: boolean;
    required?: boolean;
    hidden?: boolean;
    show_when?: { key: string; value: string } | null;
};
export const DOCUMENT_FONTS = [
    'Arial',
    'Calibri',
    'Times New Roman',
    'Verdana',
    'Georgia',
];
export const paragraph = (content: DocumentNode[] = []): DocumentNode => ({
    type: 'paragraph',
    content,
});
export const documentFieldOptions = (field: DocumentField): string[] | null =>
    ['seleccion_unica', 'seleccion_multiple'].includes(field.type ?? '')
        ? (field.options?.map((option) => option.value) ?? [])
        : null;
export const fieldNode = (field: DocumentField): DocumentNode => ({
    type: 'field',
    attrs: {
        key: field.key,
        label: field.label,
        kind: field.type ?? 'texto_largo',
        choice: null,
        options: documentFieldOptions(field),
    },
});
export const nodesOfType = (
    doc: DocumentNode,
    type: string,
): DocumentNode[] => [
    ...(doc.type === type ? [doc] : []),
    ...(doc.content ?? []).flatMap((child) => nodesOfType(child, type)),
];

export function defaultDocument(
    block: {
        content_type: string;
        fields: DocumentField[];
    },
    identification: DocumentNode,
): DocumentNode {
    if (block.content_type === 'institutional') {
        return JSON.parse(JSON.stringify(identification)) as DocumentNode;
    }

    const first = block.fields[0];

    return { type: 'doc', content: [paragraph(first ? [fieldNode(first)] : [])] };
}

export const displayDocumentValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
    }

    if (Array.isArray(value)) {
        return value.map(displayDocumentValue).join(' · ');
    }

    if (typeof value === 'object') {
        return Object.values(value).map(displayDocumentValue).join(' · ');
    }

    return String(value);
};
