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
    if (!Array.isArray(value.content)) {
        return { node, repaired: false };
    }

    const content: SourceDocumentNode[] = [];
    let repaired = false;

    for (const child of value.content) {
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
