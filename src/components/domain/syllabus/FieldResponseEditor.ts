import { Plus, Trash2 } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import BlockForm from '@/components/domain/syllabus/BlockForm';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { blankResponse, cloneResponse, replaceResponse, responseAt, responseDocument, responseListTable, responseText } from '@/lib/fieldResponses';
import { templateRuntime } from '@/lib/blocks/runtime';
import type { DocumentNode } from '@/lib/templateDocument';

const isHeaderRow = (row: DocumentNode): boolean => Boolean(row.content?.length) && row.content!.every((cell) => cell.type === 'tableHeader');
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
                    id, modelValue: text, disabled: props.disabled, class: 'min-h-9',
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
            const columns: string[] = [];
            for (const cell of headers[headers.length - 1]?.content ?? []) {
                for (let span = 0; span < Number(cell.attrs?.colspan ?? 1); span++) columns.push(responseText(cell).trim());
            }
            const list = responseListTable(template);
            let position = 0;
            const groups = values.map((_, index) => {
                const rowTemplate = rows[index] ?? rows[rows.length - 1]!;
                if (isHeaderRow(rowTemplate) || !hasResponse(rowTemplate)) return null;
                position++;
                let title = `Fila ${position}`;
                let column = 0;
                const inputs: VNodeChild[] = [];
                (rowTemplate.content ?? []).forEach((cell, cellIndex) => {
                    const name = columns[column] || `Columna ${column + 1}`;
                    column += Number(cell.attrs?.colspan ?? 1);
                    const cellPath = [...path, index, cellIndex];
                    if (blankResponse(cell)) {
                        inputs.push(slot(cell, cellPath, name, true));
                        return;
                    }
                    if (hasResponse(cell)) {
                        inputs.push(h('div', { class: 'flex flex-col gap-4 sm:col-span-2' }, nodes(cell, cellPath)));
                        return;
                    }
                    const text = responseText(cell).trim();
                    if (cellIndex === 0 && !list && text) title = text;
                    else if (text) inputs.push(h('p', { class: 'text-sm text-muted-foreground sm:col-span-2' }, [h('span', { class: 'font-medium text-foreground' }, `${name}: `), text]));
                });
                const number = position;
                return h('section', { key: index, class: 'flex flex-col gap-4 rounded-lg p-4 ring-1 ring-surface-ring', 'aria-label': title }, [
                    h('div', { class: 'flex items-center justify-between gap-2' }, [
                        h('h3', { class: 'font-semibold' }, title),
                        list ? h(Button, {
                            type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || values.length <= rows.length,
                            'aria-label': `Quitar fila ${number}`,
                            onClick: () => update(path, { ...current, content: values.filter((__, other) => other !== index) }),
                        }, () => h(Trash2, { 'aria-hidden': 'true' })) : null,
                    ]),
                    h('div', { class: 'grid gap-4 sm:grid-cols-2' }, inputs),
                ]);
            });
            return h('div', { class: 'flex flex-col gap-4' }, [
                ...groups,
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
            if (!props.template || blankResponse(props.template)) return h(FreeTextEditor, {
                id: props.id, label: props.label, modelValue: props.modelValue ?? props.template, disabled: props.disabled,
                'onUpdate:modelValue': (value: DocumentNode) => emit('update:modelValue', value),
            });
            return h('div', { id: props.id, class: 'flex min-w-0 flex-col gap-4', role: 'group', 'aria-label': props.label }, nodes(props.template, []));
        };
    },
});
