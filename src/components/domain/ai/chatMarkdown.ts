import { h, type VNode } from 'vue';

const inline = (text: string): Array<string | VNode> => text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    .map((part) => (part.startsWith('**') && part.endsWith('**') ? h('strong', part.slice(2, -2)) : part));

export const renderChatMarkdown = (text: string): VNode[] => {
    const blocks: VNode[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let paragraph: string[] = [];
    const flushParagraph = (): void => {
        if (paragraph.length) blocks.push(h('p', inline(paragraph.join(' '))));
        paragraph = [];
    };
    const flushList = (): void => {
        if (list) blocks.push(h(list.ordered ? 'ol' : 'ul', { class: list.ordered ? 'list-decimal pl-8' : 'list-disc pl-5' }, list.items.map((item) => h('li', inline(item)))));
        list = null;
    };
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        const bullet = /^[-*•]\s+(.*)$/.exec(line);
        const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
        const heading = /^#{1,6}\s+(.*)$/.exec(line);
        if (bullet || numbered) {
            flushParagraph();
            const ordered = Boolean(numbered);
            if (list && list.ordered !== ordered) flushList();
            list ??= { ordered, items: [] };
            list.items.push((bullet ?? numbered)![1]!);
        } else if (heading) {
            flushParagraph(); flushList();
            blocks.push(h('p', { class: 'font-semibold' }, inline(heading[1]!)));
        } else if (line === '') {
            flushParagraph(); flushList();
        } else {
            flushList();
            paragraph.push(line);
        }
    }
    flushParagraph(); flushList();

    return blocks;
};
