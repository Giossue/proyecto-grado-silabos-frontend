import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import DocumentBlockContent from '@/components/domain/syllabus/DocumentBlockContent';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { renderFreeText, type RenderOptions } from '@/components/domain/syllabus/freeTextRender';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { blankResponse, cloneResponse, replaceResponse, responseAt, responseDocument, responseListTable, responseText } from '@/lib/fieldResponses';
import { templateRuntime } from '@/lib/blocks/runtime';
import type { DocumentNode } from '@/lib/templateDocument';

type ResponseNode = DocumentNode & { responsePath?: number[]; responseTemplate?: DocumentNode };

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
        const decorate = (template: DocumentNode, value: DocumentNode, path: number[] = []): ResponseNode => {
            if (template.type === 'tableHeader') return template;
            if (blankResponse(template)) {
                const slot: ResponseNode = { type: 'responseSlot', responsePath: path, responseTemplate: template };
                return template.type === 'tableCell' ? { ...template, content: [slot] } : slot;
            }
            if (template.type === 'documentBlock') return { ...value, responsePath: path };
            const children = template.content ?? [];
            return children.length === 0 ? template : {
                ...template,
                ...(template.type === 'table' && responseListTable(template) ? { responsePath: path, responseTemplate: template } : {}),
                content: (value.content ?? children).map((child, index) => decorate(children[index] ?? children[children.length - 1]!, child, [...path, index])),
            };
        };
        const slot = (node: ResponseNode): VNodeChild => {
            const path = node.responsePath!;
            const current = responseAt(document.value!, path);
            const source = node.responseTemplate!;
            const id = `${props.id}-${path.join('-')}`;
            let label = props.label;
            for (let depth = 0; depth < path.length - 1; depth++) {
                const ancestor = responseAt(props.template!, path.slice(0, depth));
                if (ancestor.type !== 'table') continue;
                const row = path[depth]!;
                const column = path[depth + 1]!;
                const headers = (ancestor.content ?? []).filter((item) => item.content?.every((cell) => cell.type === 'tableHeader'));
                const heading = headers[headers.length - 1]?.content?.[column];
                const first = ancestor.content?.[row]?.content?.[0];
                const rowLabel = first && !blankResponse(first) ? responseText(first) : `Fila ${row - headers.length + 1}`;
                label = [props.label, rowLabel, heading ? responseText(heading) : `Columna ${column + 1}`].join(', ');
                break;
            }
            if (source.type === 'paragraph') {
                const text = (current.content ?? []).map((part) => part.type === 'hardBreak' ? '\n' : part.text ?? '').join('');
                return h(Textarea, {
                    id, modelValue: text, disabled: props.disabled, 'aria-label': label, placeholder: 'Ej. Escriba su respuesta',
                    'onUpdate:modelValue': (value: string | number) => {
                        const content: DocumentNode[] = String(value).split('\n').flatMap((line, index) => [...(index > 0 ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line }] : [])]);
                        update(path, { ...source, content });
                    },
                });
            }
            return h(FreeTextEditor, {
                id, label, disabled: props.disabled, toolbar: false, bare: true, allowTables: false,
                modelValue: { type: 'doc', content: current.content ?? [{ type: 'paragraph' }] },
                'onUpdate:modelValue': (value: DocumentNode) => update(path, { ...source, content: value.content }),
            });
        };
        const options: RenderOptions = {
            variable: (id) => templateRuntime().variables[id] ?? '',
            node: (raw, renderOptions) => {
                const node = raw as ResponseNode;
                if (node.type === 'responseSlot') return slot(node);
                if (node.type === 'documentBlock') return h(DocumentBlockContent, {
                    kind: String(node.attrs?.kind ?? ''), props: node.attrs?.props as Record<string, unknown> ?? {}, value: node.attrs?.value as Record<string, unknown> ?? {}, mode: props.disabled ? 'read' : 'fill',
                    'onUpdate:value': (value: Record<string, unknown>) => update(node.responsePath!, { ...responseAt(document.value!, node.responsePath!), attrs: { ...node.attrs, value } }),
                });
                if (node.type === 'table' && node.responsePath) {
                    const path = node.responsePath;
                    const current = responseAt(document.value!, path);
                    const source = node.responseTemplate!;
                    const rows = current.content ?? [];
                    const minimum = source.content!.length;
                    const rendering: RenderOptions = { ...renderOptions, node: (child, childOptions) => child === node ? undefined : options.node?.(child, childOptions) };
                    return h('div', { class: 'flex min-w-0 flex-col gap-2' }, [
                        h('div', { class: 'overflow-x-auto' }, [renderFreeText(node, rendering)]),
                        h('div', { class: 'flex flex-wrap gap-2' }, [
                            h(Button, { type: 'button', variant: 'outline', size: 'sm', disabled: props.disabled || rows.length >= 100, onClick: () => update(path, { ...current, content: [...rows, cloneResponse(source.content![minimum - 1]!)] }) }, () => 'Añadir fila'),
                            h(Button, { type: 'button', variant: 'outline', size: 'sm', disabled: props.disabled || rows.length <= minimum, onClick: () => update(path, { ...current, content: rows.slice(0, -1) }) }, () => 'Quitar última fila'),
                        ]),
                    ]);
                }
                return undefined;
            },
        };
        return () => {
            if (!props.template || blankResponse(props.template)) return h(FreeTextEditor, {
                id: props.id, label: props.label, modelValue: props.modelValue ?? props.template, disabled: props.disabled,
                'onUpdate:modelValue': (value: DocumentNode) => emit('update:modelValue', value),
            });
            const tree = decorate(props.template, document.value!);
            return h('div', { id: props.id, class: 'field-response-editor free-text-content flex min-w-0 flex-col gap-3', role: 'group', 'aria-label': props.label }, (tree.content ?? []).map((node) => renderFreeText(node, options)));
        };
    },
});
