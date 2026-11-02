import { Eraser, Plus, Trash2 } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import { withTooltip } from '@/components/domain/withTooltip';
import LibraryCatalogSearch from '@/components/domain/syllabus/LibraryCatalogSearch.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { CatalogBook } from '@/api/libraryCatalog';
import { addCatalogBook, canAddCatalogBook } from '@/lib/blocks/catalog';
import { holds } from '@/lib/blocks/condition';
import { ruleFailures } from '@/lib/blocks/rules';
import { blockDefinition, templateRuntime } from '@/lib/blocks/runtime';
import { Scope, type Path } from '@/lib/blocks/scope';
import { guardNumber, isChoice, isText, numberDigits, numberText, plural, type ChoiceSchema, type ListSchema, type NumberSchema, type ObjectSchema, type TextSchema, type ValueSchema } from '@/lib/blocks/types';
import { emptyValue, getAt, setAt, settle } from '@/lib/blocks/values';

type Scalar = TextSchema | NumberSchema | ChoiceSchema;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export default defineComponent({
    name: 'BlockForm',
    props: {
        id: { type: String, required: true },
        kind: { type: String, required: true },
        props: { type: Object as PropType<Record<string, unknown>>, required: true },
        value: { type: Object as PropType<Record<string, unknown>>, required: true },
        disabled: { type: Boolean, default: false },
        required: { type: Boolean, default: false },
    },
    emits: { 'update:value': (value: Record<string, unknown>) => typeof value === 'object' },
    setup(props, { emit }) {
        const definition = computed(() => blockDefinition(props.kind));
        const variables = computed(() => templateRuntime().variables);

        const change = (next: Record<string, unknown>): void => {
            if (definition.value) emit('update:value', settle(definition.value.value, next, props.props));
        };
        const write = (path: Path, next: unknown): void => change(setAt(props.value, path, next) as Record<string, unknown>);
        const listOf = (path: Path): unknown[] => {
            const list = getAt(props.value, path);
            return Array.isArray(list) ? list : [];
        };
        const fieldId = (path: Path): string => `${props.id}-${path.join('-')}`;

        const applies = (schema: ValueSchema, path: Path): boolean => {
            if (!schema.keep_if) return true;
            const parent = getAt(props.value, path.slice(0, -1));
            return holds(schema.keep_if, new Scope(isRecord(parent) ? parent : {}, props.props, variables.value));
        };

        const input = (schema: Scalar, path: Path, label: string, inCell = false): VNodeChild => {
            const id = fieldId(path);
            const current = getAt(props.value, path);
            const disabled = props.disabled;
            const text = typeof current === 'string' || typeof current === 'number' ? String(current) : '';
            const ariaLabel = inCell ? label : undefined;
            // Dentro de la tabla las líneas de la celda ya hacen de borde del campo.
            const flat = inCell ? 'border-transparent bg-transparent shadow-none' : undefined;
            if (isChoice(schema)) {
                return h(ChoiceGroup, {
                    modelValue: typeof current === 'string' ? current : undefined,
                    label,
                    disabled,
                    options: schema.oneOf.map((option) => ({ value: option.const, label: option.title })),
                    'onUpdate:modelValue': (value: unknown) => write(path, typeof value === 'string' ? value : null),
                });
            }
            if (schema.type === 'number') {
                const { digits, decimals } = numberDigits(schema);
                return h(Input, {
                    id, modelValue: text, disabled, inputmode: 'decimal', 'aria-label': ariaLabel,
                    maxlength: digits + (decimals > 0 ? decimals + 1 : 0),
                    class: inCell ? `w-20 text-center ${flat}` : undefined,
                    onBeforeinput: (event: InputEvent) => guardNumber(event, schema),
                    'onUpdate:modelValue': (value: string | number) => write(path, numberText(String(value), schema)),
                });
            }
            return h(schema.multiline ? Textarea : Input, {
                id, modelValue: text, disabled, maxlength: schema.maxLength, 'aria-label': ariaLabel,
                class: [schema.multiline ? 'min-h-9' : undefined, flat],
                'onUpdate:modelValue': (value: string | number) => write(path, String(value)),
            });
        };

        const control = (schema: Scalar, path: Path, label: string): VNodeChild => h(Field, { key: fieldId(path) }, () => [
            h(FieldLabel, { for: isChoice(schema) ? undefined : fieldId(path), required: props.required }, () => label),
            input(schema, path, label),
        ]);

        const fields = (entries: Array<[string, ValueSchema]>, path: Path, depth: number): VNodeChild[] => {
            const nodes: VNodeChild[] = [];
            let numbers: VNodeChild[] = [];
            const flush = (): void => {
                if (numbers.length > 0) nodes.push(h('div', { class: 'grid grid-cols-2 gap-4 sm:grid-cols-4' }, numbers));
                numbers = [];
            };
            for (const [key, schema] of entries) {
                const childPath = [...path, key];
                if (!applies(schema, childPath)) continue;
                if (schema.type === 'number') {
                    numbers.push(control(schema, childPath, schema.title ?? key));
                    continue;
                }
                flush();
                nodes.push(node(schema, childPath, schema.title ?? key, depth));
            }
            flush();
            return nodes;
        };

        const offset = (path: Path): number => {
            let parent = path.length - 1;
            while (parent >= 0 && typeof path[parent] !== 'number') parent--;
            if (parent < 0) return 0;
            const index = Number(path[parent]);
            const before = path.slice(0, parent);
            const after = path.slice(parent + 1);
            let total = 0;
            for (let sibling = 0; sibling < index; sibling++) total += listOf([...before, sibling, ...after]).length;
            return total;
        };

        const canAdd = (path: Path, schema: ListSchema): boolean => {
            const list = listOf(path);
            if (props.disabled || list.length >= schema.maxItems || !definition.value) return false;
            const next = setAt(props.value, path, [...list, emptyValue(schema.items, props.props)]) as Record<string, unknown>;
            return ruleFailures(definition.value.rules, next, variables.value, 'save').length === 0;
        };

        const removeButton = (schema: ListSchema, path: Path, index: number, name: string): VNodeChild => withTooltip(`Quitar ${name}`, h(Button, {
            type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || listOf(path).length <= schema.minItems,
            'aria-label': `Quitar ${name}`,
            onClick: () => write(path, listOf(path).filter((__, position) => position !== index)),
        }, () => h(Trash2, { 'aria-hidden': 'true' })));

        const isBlank = (row: unknown): boolean => isRecord(row) && Object.values(row).every((cell) => String(cell ?? '').trim() === '');

        const clearButton = (schema: ListSchema, path: Path, index: number, name: string): VNodeChild => withTooltip(`Limpiar ${name}`, h(Button, {
            type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || isBlank(listOf(path)[index]),
            'aria-label': `Limpiar ${name}`,
            onClick: () => write([...path, index], emptyValue(schema.items, props.props)),
        }, () => h(Eraser, { 'aria-hidden': 'true' })));

        const addButton = (schema: ListSchema, path: Path, name: string): VNodeChild => h(Button, {
            type: 'button', variant: 'outline', size: 'sm', class: 'w-fit', disabled: !canAdd(path, schema),
            onClick: () => write(path, [...listOf(path), emptyValue(schema.items, props.props)]),
        }, () => [h(Plus, { 'data-icon': 'inline-start', 'aria-hidden': 'true' }), `Agregar ${name}`]);

        const table = (schema: ListSchema, rows: ObjectSchema, path: Path): VNodeChild => {
            const items = listOf(path);
            const name = schema.title ?? 'elemento';
            const first = offset(path);
            const resizable = schema.minItems < schema.maxItems;
            // La lista de libros del catálogo se puede vaciar fila por fila; con una sola fila no se puede borrar.
            const clearable = path.length === 1 && definition.value?.catalog?.list === path[0];
            const columns = Object.entries(rows.properties) as Array<[string, Scalar]>;
            return h('div', { class: 'flex min-w-0 flex-col gap-3' }, [
                h(Table, { label: capitalize(name), cards: false }, () => [
                    h(TableHeader, {}, () => h(TableRow, {}, () => [
                        ...columns.map(([key, column]) => h(TableHead, { class: column.type === 'number' ? 'w-20 text-center' : 'min-w-48 whitespace-normal' }, () => column.title ?? key)),
                        resizable ? h(TableHead, { class: clearable ? 'w-20' : 'w-10', 'data-sticky-end': '' }, () => h('span', { class: 'sr-only' }, 'Acciones')) : null,
                    ])),
                    h(TableBody, {}, () => items.map((_, index) => {
                        const itemPath = [...path, index];
                        const rowName = `${name} ${first + index + 1}`;
                        return h(TableRow, { key: index }, () => [
                            ...columns.map(([key, column]) => h(TableCell, { class: 'align-top' }, () => applies(column, [...itemPath, key]) ? input(column, [...itemPath, key], `${column.title ?? key}, ${rowName}`, true) : null)),
                            resizable ? h(TableCell, { class: 'align-top', 'data-sticky-end': '' }, () => clearable
                                ? h('div', { class: 'flex' }, [clearButton(schema, path, index, rowName), removeButton(schema, path, index, rowName)])
                                : removeButton(schema, path, index, rowName)) : null,
                        ]);
                    })),
                ]),
                resizable ? addButton(schema, path, name) : null,
            ]);
        };

        const list = (schema: ListSchema, path: Path, depth: number): VNodeChild => {
            if (schema.items.type === 'object' && Object.values(schema.items.properties).every((column) => column.type === 'string' || column.type === 'number')) {
                return table(schema, schema.items, path);
            }
            const items = listOf(path);
            const name = schema.title ?? 'elemento';
            const first = offset(path);
            const resizable = schema.minItems < schema.maxItems;
            const missing = (itemPath: Path): string[] => {
                if (schema.items.type !== 'object') return [];
                return Object.entries(schema.items.properties).flatMap(([key, child]) => {
                    const childPath = [...itemPath, key];
                    if (!applies(child, childPath)) return [];
                    const value = getAt(props.value, childPath);
                    if (child.type === 'array') return Array.isArray(value) && value.length > 0 ? [] : [plural(child.title ?? key)];
                    if (isText(child)) return typeof value === 'string' && value.trim() !== '' ? [] : [(child.title ?? key).toLowerCase()];
                    return [];
                });
            };
            const subtitle = (itemPath: Path): string => {
                if (schema.items.type !== 'object') return '';
                const key = Object.entries(schema.items.properties).find(([, child]) => isText(child))?.[0];
                const value = key === undefined ? '' : getAt(props.value, [...itemPath, key]);
                return typeof value === 'string' ? value.trim() : '';
            };
            return h('div', { class: 'flex flex-col gap-4' }, [
                h(Accordion, { type: 'multiple', defaultValue: items.length > 0 ? ['0'] : [], class: 'rounded-lg px-3 ring-1 ring-surface-ring' }, () => items.map((_, index) => {
                    const itemPath = [...path, index];
                    const title = `${capitalize(name)} ${first + index + 1}`;
                    const detail = subtitle(itemPath);
                    const pending = missing(itemPath);
                    const content = schema.items.type === 'object'
                        ? fields(Object.entries(schema.items.properties), itemPath, depth + 1)
                        : [node(schema.items, itemPath, title, depth + 1)];
                    return h(AccordionItem, { key: index, value: String(index), 'aria-label': title }, () => [
                        h(AccordionTrigger, { class: 'px-1 hover:no-underline' }, () => h('span', { class: 'flex min-w-0 flex-col gap-0.5' }, [
                            h('span', { class: 'font-semibold' }, title),
                            detail ? h('span', { class: 'line-clamp-1 font-normal text-muted-foreground' }, detail) : null,
                            pending.length > 0 ? h('span', { class: 'line-clamp-1 font-normal text-muted-foreground' }, `Falta: ${pending.join(', ')}`) : null,
                        ])),
                        h(AccordionContent, { class: 'flex flex-col gap-4 px-1 pt-1' }, () => [
                            ...content,
                            resizable ? h('div', { class: 'flex justify-end' }, [removeButton(schema, path, index, `${name} ${first + index + 1}`)]) : null,
                        ]),
                    ]);
                })),
                resizable ? addButton(schema, path, name) : null,
            ]);
        };

        function node(schema: ValueSchema, path: Path, label: string, depth: number): VNodeChild {
            if (schema.type === 'object') return h('div', { class: 'flex flex-col gap-4' }, fields(Object.entries(schema.properties), path, depth));
            if (schema.type === 'array') return list(schema, path, depth);
            return control(schema, path, label);
        }

        return () => {
            const block = definition.value;
            if (!block) return h('p', { class: 'text-muted-foreground' }, 'Bloque sin definición en la plantilla');
            const search = block.catalog ? h(LibraryCatalogSearch, {
                disabled: props.disabled || !canAddCatalogBook(block, props.value),
                onPick: (book: CatalogBook) => {
                    const next = addCatalogBook(block, props.value, book, props.props);
                    if (next) change(next);
                },
            }) : null;

            return h('div', { id: props.id, class: 'flex flex-col gap-4' }, [search, ...fields(Object.entries(block.value), [], 0)]);
        };
    },
});
