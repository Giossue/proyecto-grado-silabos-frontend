import { Plus, Trash2, X } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import BlockForm from '@/components/domain/syllabus/BlockForm';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import ResponseAnswer from '@/components/domain/syllabus/ResponseAnswer.vue';
import ResponseOptionsEditor from '@/components/domain/syllabus/ResponseOptionsEditor.vue';
import TemplateResponseTool from '@/components/domain/configuration/TemplateResponseTool.vue';
import { renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import { withTooltip } from '@/components/domain/withTooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { onlyHiddenResponses, responseShown } from '@/lib/responseConditions';
import { blankResponse, cloneResponse, replaceResponse, responseAt, responseDocument, responseListTable, responseText } from '@/lib/fieldResponses';
import { templateRuntime } from '@/lib/blocks/runtime';
import {
    RESPONSE_KINDS, RESPONSE_NODE, keptAnswer, responseAdjustable, responseAnswered, responseAttrs, responseLines, responseNeedsOptions, sameResponseOptions, withinResponse, type ResponseOption,
} from '@/lib/responseKinds';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';

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
const hasResponse = (node: DocumentNode): boolean => blankResponse(node) || node.type === 'documentBlock' || node.type === RESPONSE_NODE || (node.content ?? []).some(hasResponse);
const lineText = (node: DocumentNode): string => (node.content ?? []).map((part) => part.type === 'hardBreak' ? '\n' : part.text ?? '').join('');
const withOwnOptions = (document: DocumentNode, value: DocumentNode | null | undefined): DocumentNode => {
    if (!value || value.type !== document.type) return document;
    if (document.type === RESPONSE_NODE) {
        const own = responseAttrs(value);
        return own.kind === responseAttrs(document).kind && responseAdjustable(responseAttrs(document)) && own.options.length > 0
            ? { ...document, attrs: { ...document.attrs, options: own.options } }
            : document;
    }
    return document.content ? { ...document, content: document.content.map((child, index) => withOwnOptions(child, value.content?.[index])) } : document;
};
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
        career: { type: Boolean, default: false },
        askFor: { type: String, default: 'al coordinador' },
        answers: { type: Object as PropType<Record<string, unknown> | null>, default: null },
    },
    emits: { 'update:modelValue': (value: DocumentNode) => Boolean(value) },
    setup(props, { emit }) {
        const document = computed(() => {
            if (!props.template) return props.modelValue;
            const built = responseDocument(props.template, props.modelValue, props.career);
            return props.career ? withOwnOptions(built, props.modelValue) : built;
        });
        const placeSpace = (path: number[], node: DocumentNode): void => {
            if (!props.template) return;
            const blank = cloneResponse(responseAt(props.template, path));
            update(path, blank.type === 'paragraph'
                ? { ...blank, content: [node] }
                : { ...blank, content: [{ ...(blank.content?.[0] ?? { type: 'paragraph' }), content: [node] }] });
        };
        const clearSpace = (path: number[]): void => {
            if (props.template) update(path, cloneResponse(responseAt(props.template, path)));
        };
        const optionsEditor = (current: DocumentNode, path: number[], label: string): VNodeChild => h(ResponseOptionsEditor, {
            modelValue: responseAttrs(current).options, label: `Opciones de ${label}`, disabled: props.disabled,
            'onUpdate:modelValue': (options: ResponseOption[]) => update(path, { ...current, attrs: { ...current.attrs, options } }),
        });
        const spaceTool = (path: number[]): VNodeChild => h(TemplateResponseTool, {
            label: 'Espacio para el docente', hint: 'El docente solo responde: no cambia el tipo ni las opciones',
            optionsHint: 'Escriba las opciones que podrá elegir el docente', requireOptions: true, disabled: props.disabled,
            onInsert: (node: DocumentNode) => placeSpace(path, node),
        });
        const careerSpace = (current: DocumentNode, path: number[], slotPath: number[], label: string): VNodeChild => {
            const attrs = responseAttrs(current);
            return h('div', { key: `${props.id}-${path.join('-')}`, class: 'flex min-w-0 flex-col gap-2', 'data-career-space': attrs.kind }, [
                h('div', { class: 'flex flex-wrap items-center gap-1' }, [
                    h(Badge, { variant: 'secondary', class: 'w-fit font-normal' }, () => `Espacio para el docente: ${RESPONSE_KINDS[attrs.kind]?.label ?? 'Respuesta'}`),
                    withTooltip('Quitar el espacio', h(Button, {
                        type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled, 'aria-label': `Quitar el espacio de ${label}`,
                        onClick: () => clearSpace(slotPath),
                    }, () => h(X, { 'aria-hidden': 'true' }))),
                ]),
                attrs.options.length || responseNeedsOptions(attrs) ? optionsEditor(current, path, label) : null,
            ]);
        };
        const templateSpace = (template: DocumentNode, current: DocumentNode, path: number[], label: string): VNodeChild => {
            const base = responseAttrs(template).options;
            const attrs = responseAttrs(current);
            return h('div', { key: `${props.id}-${path.join('-')}`, class: 'flex min-w-0 flex-col gap-2' }, [
                h('div', { class: 'flex flex-wrap items-center gap-1' }, [
                    h(Badge, { variant: 'outline', class: 'w-fit font-normal', 'data-template-response': '' }, () => 'De la plantilla'),
                    sameResponseOptions(attrs.options, base) ? null : h(Badge, { variant: 'secondary', class: 'w-fit font-normal' }, () => 'Opciones propias'),
                    h(TemplateResponseTool, {
                        label: 'Opciones de la respuesta', current: attrs, fixed: true, templateOptions: base, disabled: props.disabled,
                        onInsert: (node: DocumentNode) => {
                            const options = responseAttrs(node).options;
                            update(path, { ...current, attrs: { ...node.attrs, value: keptAnswer(attrs.value, options) as never } });
                        },
                    }),
                ]),
                h(ResponseAnswer, {
                    attrs, label, disabled: props.disabled, askFor: props.askFor,
                    'onUpdate:value': (value: unknown) => update(path, { ...current, attrs: { ...current.attrs, value: value as never } }),
                }),
            ]);
        };
        const response = (template: DocumentNode, path: number[], label: string): VNodeChild => {
            if (props.answers && !responseShown(template, props.answers)) return null;
            const current = responseAt(document.value!, path);
            if (props.career && responseAdjustable(responseAttrs(template))) return templateSpace(template, current, path, label);
            if (props.career && responseNeedsOptions(responseAttrs(template))) {
                return h('div', { key: `${props.id}-${path.join('-')}`, class: 'flex min-w-0 flex-col gap-2' }, [
                    h(Badge, { variant: 'secondary', class: 'w-fit font-normal' }, () => `${RESPONSE_KINDS[responseAttrs(current).kind]?.label ?? 'Respuesta'} (lo definió Administración)`),
                    optionsEditor(current, path, label),
                ]);
            }
            if (!props.career && responseAnswered(responseAttrs(template))) {
                return h('span', { key: `${props.id}-${path.join('-')}`, class: 'py-1 text-muted-foreground' }, responseLines(responseAttrs(template)).join(', '));
            }
            return h(ResponseAnswer, {
                key: `${props.id}-${path.join('-')}`, attrs: responseAttrs(current), label, disabled: props.disabled, askFor: props.askFor,
                'onUpdate:value': (value: unknown) => update(path, { ...current, attrs: { ...current.attrs, value: value as never } }),
            });
        };
        const hiddenLine = (node: DocumentNode): boolean => Boolean(props.answers) && onlyHiddenResponses(node, props.answers!);
        const line = (template: DocumentNode, path: number[], label: string): VNodeChild => hiddenLine(template) ? null : h('div', { class: 'flex flex-wrap items-start gap-2 text-sm' },
            (template.content ?? []).map((child, index) => child.type === RESPONSE_NODE
                ? response(child, [...path, index], label)
                : h('span', { class: 'py-1 text-muted-foreground' }, [renderFreeText(child, { variable })])));
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
                    if (hiddenLine(blankResponse(cell) ? responseAt(document.value!, cellPath) : cell)) return h(TableCell, { ...span, class: 'align-top' });
                    if (blankResponse(cell)) return h(TableCell, { ...span, class: 'min-w-40 align-top' }, () => blankSlot(cell, cellPath, `${name}, fila ${number}`));
                    if (hasResponse(cell)) return h(TableCell, { ...span, class: 'min-w-40 align-top' }, () => nodes(cell, cellPath, `${name}, fila ${number}`));
                    return h(TableCell, { ...span, class: 'align-top text-sm' }, () => responseText(cell).trim());
                });
                return h(TableRow, { key: index }, () => [
                    ...cells,
                    list ? h(TableCell, { class: 'w-10 align-top', 'data-sticky-end': '' }, () => withTooltip(`Quitar fila ${number}`, h(Button, {
                        type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || values.length <= rows.length,
                        'aria-label': `Quitar fila ${number}`,
                        onClick: () => update(path, { ...current, content: values.filter((__, other) => other !== index) }),
                    }, () => h(Trash2, { 'aria-hidden': 'true' })))) : null,
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

        const blankSlot = (template: DocumentNode, path: number[], label: string): VNodeChild => {
            const current = responseAt(document.value!, path);
            if (props.career) {
                const spaces = nodesOfType(current, RESPONSE_NODE);
                if (spaces.length) {
                    const located = (node: DocumentNode, at: number[]): number[][] => node.type === RESPONSE_NODE ? [at] : (node.content ?? []).flatMap((child, index) => located(child, [...at, index]));
                    return h('div', { key: `${props.id}-${path.join('-')}`, class: 'flex min-w-0 flex-col gap-2' }, [
                        responseText(current).trim() ? h('p', { class: 'text-sm text-muted-foreground' }, responseText(current).trim()) : null,
                        ...located(current, path).map((at) => careerSpace(responseAt(document.value!, at), at, path, label)),
                    ]);
                }
                return h('div', { key: `${props.id}-${path.join('-')}`, class: 'flex min-w-0 items-start gap-1' }, [
                    h('div', { class: 'min-w-0 flex-1' }, [slot(template, path, label, false)]),
                    spaceTool(path),
                ]);
            }
            if (withinResponse(current)) return current.type === 'paragraph' ? line(current, path, label) : h('div', { class: 'flex flex-col gap-2' }, nodes(current, path, label));
            return slot(template, path, label, false);
        };

        const render = (template: DocumentNode, path: number[], label: string = props.label): VNodeChild => {
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
            if (template.type === RESPONSE_NODE) return response(template, path, label);
            if (blankResponse(template)) return blankSlot(template, path, label);
            if (template.type === 'paragraph' && hasResponse(template)) return line(template, path, label);
            if (template.type === 'table' && hasResponse(template)) return table(template, path);
            if (hasResponse(template)) return h('div', { class: 'flex flex-col gap-4' }, nodes(template, path, label));
            return h('div', { class: 'text-sm text-muted-foreground' }, [renderFreeText(current, { variable })]);
        };

        function nodes(template: DocumentNode, path: number[], label: string = props.label): VNodeChild[] {
            return (template.content ?? []).map((child, index) => render(child, [...path, index], label));
        }

        return () => {
            const legacy = props.modelValue;
            if ((!props.template || blankResponse(props.template)) && legacy && onlyBlocks(legacy)) {
                return h('div', { id: props.id, class: 'flex min-w-0 flex-col gap-4', role: 'group', 'aria-label': props.label },
                    (legacy.content ?? []).map((node, index) => node.type === 'documentBlock' ? render(node, [index]) : null));
            }
            if (!props.template || blankResponse(props.template)) return h(FreeTextEditor, {
                id: props.id, label: props.label, modelValue: props.modelValue ?? props.template, disabled: props.disabled, allowTables: false, spaces: props.career,
                'onUpdate:modelValue': (value: DocumentNode) => emit('update:modelValue', value),
            });
            return h('div', { id: props.id, class: 'flex min-w-0 flex-col gap-4', role: 'group', 'aria-label': props.label }, nodes(props.template, []));
        };
    },
});
