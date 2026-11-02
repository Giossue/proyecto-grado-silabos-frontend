import { Plus, Trash2 } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import BlockForm from '@/components/domain/syllabus/BlockForm';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { blankResponse, cloneResponse, replaceResponse, responseAt, responseDocument, responseListTable, responseText } from '@/lib/fieldResponses';
import { templateRuntime } from '@/lib/blocks/runtime';
import type { DocumentNode } from '@/lib/templateDocument';

const isHeaderRow = (row: DocumentNode): boolean => Boolean(row.content?.length) && row.content!.every((cell) => cell.type === 'tableHeader');
const headerColumns = (headers: DocumentNode[]): string[] => {
    const grid: string[][] = headers.map(() => []);
    headers.forEach((row, rowIndex) => {
        let column = 0;
        for (const cell of row.content ?? []) {
            while (grid[rowIndex]![column] !== undefined) column++;
            const text = responseText(cell).trim();
            for (let down = 0; down < Number(cell.attrs?.rowspan ?? 1) && rowIndex + down < headers.length; down++) {
                for (let across = 0; across < Number(cell.attrs?.colspan ?? 1); across++) grid[rowIndex + down]![column + across] = text;
            }
            column += Number(cell.attrs?.colspan ?? 1);
        }
    });
    return grid[grid.length - 1] ?? [];
};
const onlyBlocks = (document: DocumentNode): boolean => (document.content ?? []).some((node) => node.type === 'documentBlock')
    && (document.content ?? []).every((node) => node.type === 'documentBlock' || blankResponse(node));
const hasResponse = (node: DocumentNode): boolean => blankResponse(node) || node.type === 'documentBlock' || (node.content ?? []).some(hasResponse);
const lineText = (node: DocumentNode): string => (node.content ?? []).map((part) => part.type === 'hardBreak' ? '\n' : part.text ?? '').join('');
const inline = (text: string): DocumentNode[] => text.split('\n').flatMap((line, index) => [...(index > 0 ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line }] : [])]);

export default defineComponent({
    name: 'FieldResponseEditor',
    props: {
        id: { type: String, required: true },
        label: { type: String, required: true },
        template: { type: Object as PropType<DocumentNode | null>, default: null },
        modelValue: { type: Object as PropType<DocumentNode | null>, default: null },
        disabled: { type: Boolean, default: false },
        required: { type: Boolean, default: false },
    },
    emits: { 'update:modelValue': (value: DocumentNode) => Boolean(value) },
    setup(props, { emit }) {
        const document = computed(() => props.template ? responseDocument(props.template, props.modelValue) : props.modelValue);
        const update = (path: number[], value: DocumentNode): void => {
            if (!props.disabled && document.value) emit('update:modelValue', replaceResponse(document.value, path, value));
        };
        const variable = (id: string): string => templateRuntime().variables[id] ?? '';

        const slot = (template: DocumentNode, path: number[], label: string, visibleLabel: boolean): VNodeChild => {
            const id = `${props.id}-${path.join('-')}`;
            const current = responseAt(document.value!, path);
            const paragraph = template.type === 'paragraph';
            const text = paragraph ? lineText(current) : (current.content ?? []).map(lineText).join('\n');
            const write = (value: string): void => update(path, paragraph
                ? { ...template, content: inline(value) }
                : { ...template, content: value.split('\n').map((line) => ({ ...(template.content?.[0] ?? { type: 'paragraph' }), content: line ? [{ type: 'text', text: line }] : [] })) });
            return h(Field, { key: id }, () => [
                visibleLabel ? h(FieldLabel, { for: id }, () => label) : null,
                h(Textarea, {
                    id, modelValue: text, disabled: props.disabled, class: visibleLabel ? 'min-h-9' : 'min-h-9 border-transparent bg-transparent shadow-none',
                    'aria-label': visibleLabel ? undefined : label,
                    'onUpdate:modelValue': (value: string | number) => write(String(value)),
                }),
            ]);
        };

        const table = (template: DocumentNode, path: number[]): VNodeChild => {
            const current = responseAt(document.value!, path);
            const rows = template.content ?? [];
            const values = current.content ?? [];
            const headers = rows.filter(isHeaderRow);
            const columns = headerColumns(headers);
            const list = responseListTable(template);
            let position = 0;
            const body = values.map((_, index) => {
                const rowTemplate = rows[index] ?? rows[rows.length - 1]!;
                if (isHeaderRow(rowTemplate)) return null;
                position++;
                const number = position;
                let column = 0;
                const cells = (rowTemplate.content ?? []).map((cell, cellIndex) => {
                    const name = columns[column] || `Columna ${column + 1}`;
                    const span = { colspan: Number(cell.attrs?.colspan ?? 1), rowspan: Number(cell.attrs?.rowspan ?? 1) };
                    column += span.colspan;
                    const cellPath = [...path, index, cellIndex];
                    if (blankResponse(cell)) return h(TableCell, { ...span, class: 'min-w-40 align-top' }, () => slot(cell, cellPath, `${name}, fila ${number}`, false));
                    if (hasResponse(cell)) return h(TableCell, { ...span, class: 'min-w-40 align-top' }, () => nodes(cell, cellPath));
                    return h(TableCell, { ...span, class: 'align-top text-sm' }, () => responseText(cell).trim());
                });
                return h(TableRow, { key: index }, () => [
                    ...cells,
                    list ? h(TableCell, { class: 'w-10 align-top', 'data-sticky-end': '' }, () => h(Button, {
                        type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || values.length <= rows.length,
                        'aria-label': `Quitar fila ${number}`,
                        onClick: () => update(path, { ...current, content: values.filter((__, other) => other !== index) }),
                    }, () => h(Trash2, { 'aria-hidden': 'true' }))) : null,
                ]);
            });
            return h('div', { class: 'flex min-w-0 flex-col gap-3' }, [
                h(Table, { label: props.label, cards: false }, () => [
                    headers.length > 0 ? h(TableHeader, {}, () => headers.map((row, rowIndex) => h(TableRow, { key: rowIndex }, () => [
                        ...(row.content ?? []).map((cell) => h(TableHead, {
                            colspan: Number(cell.attrs?.colspan ?? 1), rowspan: Number(cell.attrs?.rowspan ?? 1), class: 'h-auto py-2 whitespace-normal',
                        }, () => responseText(cell).trim())),
                        list && rowIndex === 0 ? h(TableHead, { rowspan: headers.length, class: 'w-10', 'data-sticky-end': '' }, () => h('span', { class: 'sr-only' }, 'Acciones')) : null,
                    ]))) : null,
                    h(TableBody, {}, () => body),
                ]),
                list ? h(Button, {
                    type: 'button', variant: 'outline', size: 'sm', class: 'w-fit', disabled: props.disabled || values.length >= 100,
                    onClick: () => update(path, { ...current, content: [...values, cloneResponse(rows[rows.length - 1]!)] }),
                }, () => [h(Plus, { 'data-icon': 'inline-start', 'aria-hidden': 'true' }), 'Agregar fila']) : null,
            ]);
        };

        const render = (template: DocumentNode, path: number[]): VNodeChild => {
            const current = responseAt(document.value!, path);
            if (template.type === 'documentBlock') {
                return h(BlockForm, {
                    id: `${props.id}-${path.join('-')}`,
                    kind: String(current.attrs?.kind ?? ''),
                    props: (current.attrs?.props ?? {}) as Record<string, unknown>,
                    value: (current.attrs?.value ?? {}) as Record<string, unknown>,
                    disabled: props.disabled,
                    required: props.required,
                    'onUpdate:value': (value: Record<string, unknown>) => update(path, { ...responseAt(document.value!, path), attrs: { ...current.attrs, value } }),
                });
            }
            if (blankResponse(template)) return slot(template, path, props.label, false);
            if (template.type === 'table' && hasResponse(template)) return table(template, path);
            if (hasResponse(template)) return h('div', { class: 'flex flex-col gap-4' }, nodes(template, path));
            return h('div', { class: 'text-sm text-muted-foreground' }, [renderFreeText(current, { variable })]);
        };

        function nodes(template: DocumentNode, path: number[]): VNodeChild[] {
            return (template.content ?? []).map((child, index) => render(child, [...path, index]));
        }

        return () => {
            const legacy = props.modelValue;
            if ((!props.template || blankResponse(props.template)) && legacy && onlyBlocks(legacy)) {
                return h('div', { id: props.id, class: 'flex min-w-0 flex-col gap-4', role: 'group', 'aria-label': props.label },
                    (legacy.content ?? []).map((node, index) => node.type === 'documentBlock' ? render(node, [index]) : null));
            }
            if (!props.template || blankResponse(props.template)) return h(FreeTextEditor, {
                id: props.id, label: props.label, modelValue: props.modelValue ?? props.template, disabled: props.disabled, allowTables: false,
                'onUpdate:modelValue': (value: DocumentNode) => emit('update:modelValue', value),
            });
            return h('div', { id: props.id, class: 'flex min-w-0 flex-col gap-4', role: 'group', 'aria-label': props.label }, nodes(props.template, []));
        };
    },
});
