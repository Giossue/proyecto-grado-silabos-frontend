import { Minus, Plus, X } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import { renderFreeText, type RenderOptions } from '@/components/domain/syllabus/freeTextRender';
import { uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { holds } from '@/lib/blocks/condition';
import { ruleFailures, ruleResults } from '@/lib/blocks/rules';
import { blockDefinition, templateRuntime } from '@/lib/blocks/runtime';
import { Scope, type Path } from '@/lib/blocks/scope';
import type { BlockDefinition, ListSchema, ValueSchema } from '@/lib/blocks/types';
import { emptyValue, getAt, setAt, settle } from '@/lib/blocks/values';
import { resolveBlock, toDocument, type ResolvedNode } from '@/lib/blocks/walk';
import type { DocumentNode } from '@/lib/templateDocument';

type Mode = 'read' | 'fill' | 'configure';
type Column = { key: string; label: string };

const describe = (definition: BlockDefinition, path: Path, props: Record<string, unknown>): { label: string; where: string } => {
    const parts: string[] = [];
    let label = '';
    let schema: ValueSchema | undefined = { type: 'object', fields: definition.value };
    for (const segment of path) {
        if (!schema) break;
        if (typeof segment === 'number') {
            if (schema.type === 'list') {
                parts.push(`${schema.label ?? 'fila'} ${segment + 1}`);
                schema = schema.item;
            }
            continue;
        }
        if (schema.type === 'row') {
            const columns = props[schema.columns];
            const column = Array.isArray(columns) ? (columns as Column[]).find((item) => item.key === segment) : undefined;
            label = column?.label ?? segment;
            schema = schema.cell;
            continue;
        }
        schema = schema.type === 'object' ? schema.fields[segment] : undefined;
        label = schema?.label ?? label;
    }
    return { label, where: parts.join(', ') };
};

export default defineComponent({
    name: 'DocumentBlockContent',
    props: {
        kind: { type: String, required: true },
        props: { type: Object as PropType<Record<string, unknown>>, required: true },
        value: { type: Object as PropType<Record<string, unknown>>, required: true },
        mode: { type: String as PropType<Mode>, default: 'read' },
    },
    emits: { 'update:value': (value: Record<string, unknown>) => typeof value === 'object', 'update:props': (props: Record<string, unknown>) => typeof props === 'object' },
    setup(props, { emit }) {
        const definition = computed(() => blockDefinition(props.kind));
        const variables = computed(() => templateRuntime().variables);

        const change = (next: Record<string, unknown>): void => {
            if (definition.value) emit('update:value', settle(definition.value.value, next, props.props));
        };
        const write = (path: Path, next: unknown): void => change(setAt(props.value, path, next) as Record<string, unknown>);
        const parentAllows = (path: Path, schema: ValueSchema | null): boolean => {
            if (!schema?.keep_if) return true;
            const parent = getAt(props.value, path.slice(0, -1));
            return holds(schema.keep_if, new Scope(typeof parent === 'object' && parent !== null && !Array.isArray(parent) ? parent as Record<string, unknown> : {}, props.props, variables.value));
        };

        const control = (node: ResolvedNode): VNodeChild => {
            const slot = node.slot!;
            const schema = slot.schema;
            const current = getAt(props.value, slot.path);
            const described = definition.value ? describe(definition.value, slot.path, props.props) : { label: '', where: '' };
            const label = [described.label || 'Dato', described.where].filter(Boolean).join(', ');
            const fromProfile = schema?.type === 'text' && schema.from !== undefined;
            const disabled = fromProfile || !parentAllows(slot.path, schema);
            if (schema?.type === 'choice' && slot.option !== undefined) {
                return h(Checkbox, {
                    modelValue: current === slot.option,
                    disabled,
                    'aria-label': `${label}: ${schema.options[slot.option] ?? slot.option}`,
                    'onUpdate:modelValue': (checked: boolean | 'indeterminate') => write(slot.path, checked === true ? slot.option : null),
                });
            }
            if (schema?.type === 'choice') {
                return h(ChoiceGroup, {
                    modelValue: typeof current === 'string' ? current : undefined,
                    label,
                    disabled,
                    options: Object.entries(schema.options).map(([value, text]) => ({ value, label: text })),
                    'onUpdate:modelValue': (value: unknown) => write(slot.path, typeof value === 'string' ? value : null),
                });
            }
            const text = typeof current === 'string' || typeof current === 'number' ? String(current) : '';
            if (schema?.type === 'number') {
                return h(Input, {
                    modelValue: text,
                    disabled,
                    inputmode: 'decimal',
                    maxlength: schema.digits + (schema.decimals > 0 ? schema.decimals + 1 : 0),
                    class: 'h-7 w-full min-w-10 max-w-16 px-1 py-0 text-center',
                    'aria-label': label,
                    'onUpdate:modelValue': (value: string | number) => write(slot.path, String(value)),
                });
            }
            const max = schema?.type === 'text' ? schema.max : 1000;
            return h(schema?.type === 'text' && schema.multiline ? Textarea : Input, {
                modelValue: text,
                disabled,
                maxlength: max,
                class: schema?.type === 'text' && schema.multiline ? 'min-h-14 w-full min-w-0 px-2 py-1' : 'h-7 w-full min-w-0 px-2 py-0',
                'aria-label': label,
                ...(fromProfile ? { title: 'Lo define Coordinación en la ficha de la asignatura.' } : {}),
                'onUpdate:modelValue': (value: string | number) => write(slot.path, String(value)),
            });
        };

        const listOf = (path: Path): unknown[] => {
            const list = getAt(props.value, path);
            return Array.isArray(list) ? list : [];
        };
        const resizable = (schema: ListSchema): boolean => schema.min < schema.max;
        const canAdd = (path: Path, schema: ListSchema): boolean => {
            const list = listOf(path);
            if (list.length >= schema.max || !definition.value) return false;
            const next = setAt(props.value, path, [...list, emptyValue(schema.item, props.props)]) as Record<string, unknown>;
            return ruleFailures(definition.value.rules, next, variables.value, 'save').length === 0;
        };

        const table = (node: ResolvedNode, options: RenderOptions): VNodeChild => {
            const rows = (node.content ?? []) as ResolvedNode[];
            const lists = new Map<string, { path: Path; schema: ListSchema }>();
            for (const row of rows) {
                if (row.row && resizable(row.row.schema)) lists.set(JSON.stringify(row.row.listPath), { path: row.row.listPath, schema: row.row.schema });
            }
            const slots = (item: ResolvedNode): number => (item.type === 'slot' ? 1 : 0) + (item.content ?? []).reduce((sum, child) => sum + slots(child as ResolvedNode), 0);
            const dense = rows.some((row) => slots(row) >= 4);
            if (lists.size === 0 && !dense) return undefined;
            const extra = (row: ResolvedNode): VNodeChild => {
                if (!row.row || !resizable(row.row.schema) || row.row.index < 0) return h('td', { class: 'w-10 border-0' });
                const { listPath, index, schema } = row.row;
                const where = definition.value ? describe(definition.value, [...listPath, index], props.props).where : '';
                return h('td', { class: 'w-10 border-0 align-middle' }, h(Button, {
                    type: 'button', variant: 'ghost', size: 'icon-sm', disabled: listOf(listPath).length <= schema.min,
                    'aria-label': `Quitar ${where}`,
                    onClick: () => {
                        const list = [...listOf(listPath)];
                        list.splice(index, 1);
                        write(listPath, list);
                    },
                }, () => h(Minus, { 'aria-hidden': 'true' })));
            };
            const rendered = h('table', { class: dense ? 'free-text-table min-w-208' : 'free-text-table' }, [h('tbody', {}, rows.filter((row) => !row.row?.placeholder).map((row) => h('tr', {}, [
                ...(row.content ?? []).map((cell) => renderFreeText(cell, options)),
                ...(lists.size > 0 ? [extra(row)] : []),
            ])))]);
            const buttons = [...lists.values()].map(({ path, schema }) => {
                const where = definition.value ? describe(definition.value, path, props.props).where : '';
                return h(Button, {
                    type: 'button', variant: 'outline', size: 'sm', class: 'w-fit', disabled: !canAdd(path, schema),
                    'aria-label': `Agregar ${schema.label ?? 'fila'}${where ? ` (${where})` : ''}`,
                    onClick: () => write(path, [...listOf(path), emptyValue(schema.item, props.props)]),
                }, () => [h(Plus, { 'data-icon': 'inline-start', 'aria-hidden': 'true' }), `Agregar ${schema.label ?? 'fila'}`]);
            });
            return h('div', { class: 'flex flex-col gap-1' }, [h('div', { class: 'overflow-x-auto' }, rendered), ...buttons]);
        };

        const fillOptions: RenderOptions = {
            node: (node, options) => {
                const resolved = node as ResolvedNode;
                if (resolved.type === 'slot' && resolved.slot) return control(resolved);
                if (resolved.type === 'table') return table(resolved, options);
                return undefined;
            },
        };

        const summary = (): VNodeChild => {
            if (!definition.value) return null;
            const results = definition.value.rules.filter((rule) => rule.on === 'submit').flatMap((rule) => ruleResults(rule, props.value, variables.value).filter((result) => result.label !== null));
            if (results.length === 0) return null;
            const hint = definition.value.rules.find((rule) => rule.on === 'submit' && rule.hint)?.hint;
            return h('div', { 'data-block-summary': '', class: 'sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-md bg-background p-2 text-sm shadow-surface ring-1 ring-surface-ring', 'aria-live': 'polite' }, [
                ...results.map((result) => h('span', { class: result.ok ? 'text-success' : 'text-destructive' }, `${result.label} ${result.actual} de ${result.expected}`)),
                hint ? h('span', { class: 'text-muted-foreground' }, hint) : null,
            ]);
        };

        const columnsEditor = (key: string, label: string, columns: Column[], min: number, max: number): VNodeChild => {
            const set = (next: Column[]): void => emit('update:props', { ...props.props, [key]: next });
            return h('div', { class: 'flex flex-col gap-1' }, [
                h('span', { class: 'text-xs font-medium text-muted-foreground' }, label),
                ...columns.map((column, index) => h('div', { key: column.key, class: 'flex items-center gap-1' }, [
                    h(Input, { modelValue: column.label, maxlength: 120, 'aria-label': `Nombre de la columna ${index + 1}`, 'onUpdate:modelValue': (text: string | number) => set(columns.map((item, position) => (position === index ? { ...item, label: String(text) } : item))) }),
                    h(Button, { type: 'button', variant: 'ghost', size: 'icon-sm', disabled: columns.length <= min, 'aria-label': `Quitar la columna ${column.label}`, onClick: () => set(columns.filter((_, position) => position !== index)) }, () => h(X, { 'aria-hidden': 'true' })),
                ])),
                h(Button, { type: 'button', variant: 'outline', size: 'sm', class: 'w-fit', disabled: columns.length >= max, onClick: () => set([...columns, { key: uniqueKey('', 'columna', columns.map((column) => column.key)), label: `Columna ${columns.length + 1}` }]) }, () => [h(Plus, { 'data-icon': 'inline-start', 'aria-hidden': 'true' }), 'Agregar columna']),
            ]);
        };

        const configure = (block: BlockDefinition): VNodeChild => h('div', { class: 'flex flex-col gap-2 rounded-md border p-2' }, [
            h('span', { class: 'text-xs font-medium text-muted-foreground' }, block.label),
            ...Object.entries(block.props).map(([key, schema]) => {
                const label = schema.label ?? key;
                if (schema.type === 'columns') {
                    const columns = Array.isArray(props.props[key]) ? (props.props[key] as Column[]) : [];
                    return columnsEditor(key, label, columns, schema.min, schema.max);
                }
                return h(Input, { modelValue: typeof props.props[key] === 'string' ? props.props[key] as string : '', maxlength: schema.max, placeholder: label, 'aria-label': label, 'onUpdate:modelValue': (text: string | number) => emit('update:props', { ...props.props, [key]: String(text) }) });
            }),
        ]);

        return () => {
            const block = definition.value;
            if (!block) return h('p', { class: 'text-muted-foreground' }, 'Bloque sin definición en la plantilla');
            if (props.mode === 'configure' && Object.keys(block.props).length > 0) return configure(block);
            const resolved = resolveBlock(block, props.props, props.value, variables.value);
            if (props.mode !== 'fill') return h('div', { class: 'document-block' }, toDocument(resolved).map((child) => renderFreeText(child, { variable: (id) => variables.value[id] ?? '' })));
            return h('div', { class: 'document-block flex flex-col gap-2' }, [summary(), ...resolved.map((child) => renderFreeText(child as DocumentNode, { ...fillOptions, variable: (id) => variables.value[id] ?? '' }))]);
        };
    },
});
