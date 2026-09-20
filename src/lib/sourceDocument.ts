import type { SourceDocument, SourceDocumentNode } from '@/api/sources';

type SanitizedNode = {
    node: SourceDocumentNode | null;
    repaired: boolean;
};

const sanitizeNode = (value: SourceDocumentNode): SanitizedNode => {
    if (value.type === 'text' && value.text === '') {
        return { node: null, repaired: true };
    }

    const node: SourceDocumentNode = { ...value };
    let repaired = false;

    if (node.type === 'heading' && Array.isArray(node.content)) {
        const first = node.content[0];
        const match = first?.type === 'text' && typeof first.text === 'string'
            ? first.text.match(/^\s{0,3}(#{1,6})\s+(.+)$/su)
            : null;

        if (match) {
            node.attrs = { ...node.attrs, level: match[1].length };
            node.content = [
                { ...first, text: match[2].trim() },
                ...node.content.slice(1),
            ];
            repaired = true;
        }
    }

    if (!Array.isArray(value.content)) {
        return { node, repaired };
    }

    const content: SourceDocumentNode[] = [];

    for (const child of node.content ?? []) {
        const result = sanitizeNode(child);
        repaired ||= result.repaired;
        if (result.node) content.push(result.node);
    }

    if (content.length > 0) node.content = content;
    else delete node.content;

    return { node, repaired };
};

export const sanitizeSourceDocument = (
    document: SourceDocument,
): { document: SourceDocument; repaired: boolean } => {
    const content: SourceDocumentNode[] = [];
    let repaired = false;

    for (const node of document.content) {
        const result = sanitizeNode(node);
        repaired ||= result.repaired;
        if (result.node) content.push(result.node);
    }

    return {
        document: { schemaVersion: 1, type: 'doc', content },
        repaired,
    };
};
