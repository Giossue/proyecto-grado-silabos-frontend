export type DocumentNode = {
    type: string;
    text?: string;
    attrs?: Record<
        string,
        string | number | boolean | null | number[] | string[] | Record<string, unknown>
    >;
    marks?: { type: string; attrs?: Record<string, string | null> }[];
    content?: DocumentNode[];
};
export type TemplateVariable = { key: string; label: string; sample: string; type?: 'texto' | 'lista' | 'tabla' };
export const paragraph = (content: DocumentNode[] = []): DocumentNode => ({
    type: 'paragraph',
    content,
});
export const nodesOfType = (
    doc: DocumentNode,
    type: string,
): DocumentNode[] => [
    ...(doc.type === type ? [doc] : []),
    ...(doc.content ?? []).flatMap((child) => nodesOfType(child, type)),
];

export type BlockKind = 'si_no' | 'repetible';
export type BlockColumn = { key: string; label: string };
export type BlockProps = { question?: string; label?: string; columns: BlockColumn[] };
export type BlockValue = { answer?: 'si' | 'no' | null; rows: Array<Record<string, string>> };

export const BLOCK_KINDS: Array<{ kind: BlockKind; label: string }> = [
    { kind: 'si_no', label: 'Pregunta Sí/No' },
    { kind: 'repetible', label: 'Lista de filas repetibles' },
];
export const MAX_BLOCK_COLUMNS = 8;

export const blockOf = (node: DocumentNode): { kind: BlockKind; props: BlockProps; value: BlockValue } => {
    const props = (node.attrs?.props ?? {}) as Partial<BlockProps>;
    const value = (node.attrs?.value ?? {}) as Partial<BlockValue>;

    return {
        kind: node.attrs?.kind === 'repetible' ? 'repetible' : 'si_no',
        props: { ...props, columns: Array.isArray(props.columns) ? props.columns : [] },
        value: { answer: value.answer ?? null, rows: Array.isArray(value.rows) ? value.rows : [] },
    };
};

export const newBlock = (kind: BlockKind): DocumentNode => ({
    type: 'documentBlock',
    attrs: {
        kind,
        props: kind === 'si_no'
            ? { question: 'Pregunta', columns: [] }
            : { label: '', columns: [{ key: 'columna', label: 'Columna' }] },
        value: kind === 'si_no' ? { answer: null, rows: [] } : { rows: [] },
    },
});

export const blockPlain = (node: DocumentNode): string => {
    const { kind, props, value } = blockOf(node);
    if (kind === 'si_no') return `${props.question ?? ''} ${value.answer === 'si' ? 'Sí' : value.answer === 'no' ? 'No' : ''}`.trim();

    return props.label ?? '';
};
