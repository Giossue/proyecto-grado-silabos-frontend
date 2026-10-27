import { Plus, Trash2 } from '@lucide/vue';
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { holds } from '@/lib/blocks/condition';
import { ruleFailures, ruleResults } from '@/lib/blocks/rules';
import { blockDefinition, templateRuntime } from '@/lib/blocks/runtime';
import { Scope, type Path } from '@/lib/blocks/scope';
import type { ChoiceSchema, ListSchema, NumberSchema, RowSchema, TextSchema, ValueSchema } from '@/lib/blocks/types';
import { emptyValue, getAt, setAt, settle } from '@/lib/blocks/values';

type Column = { key: string; label: string };

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

        const control = (schema: TextSchema | NumberSchema | ChoiceSchema, path: Path, label: string): VNodeChild => {
            const id = fieldId(path);
            const current = getAt(props.value, path);
            const fromProfile = schema.type === 'text' && schema.from !== undefined;
            const disabled = props.disabled || fromProfile;
            const text = typeof current === 'string' || typeof current === 'number' ? String(current) : '';
            let input: VNodeChild;
            if (schema.type === 'choice') {
                input = h(ChoiceGroup, {
                    modelValue: typeof current === 'string' ? current : undefined,
                    label,
                    disabled,
                    options: Object.entries(schema.options).map(([value, optionLabel]) => ({ value, label: optionLabel })),
                    'onUpdate:modelValue': (value: unknown) => write(path, typeof value === 'string' ? value : null),
                });
            } else if (schema.type === 'number') {
                input = h(Input, {
                    id, modelValue: text, disabled, inputmode: 'decimal',
                    maxlength: schema.digits + (schema.decimals > 0 ? schema.decimals + 1 : 0),
                    'onUpdate:modelValue': (value: string | number) => write(path, String(value)),
                });
            } else {
                input = h(schema.multiline || schema.max > 200 ? Textarea : Input, {
                    id, modelValue: text, disabled, maxlength: schema.max,
                    class: schema.multiline || schema.max > 200 ? 'min-h-9' : undefined,
                    'onUpdate:modelValue': (value: string | number) => write(path, String(value)),
                });
            }
            return h(Field, { key: id }, () => [
                h(FieldLabel, { for: schema.type === 'choice' ? undefined : id }, () => label),
                input,
                fromProfile ? h(FieldDescription, {}, () => 'Lo define Coordinación en la ficha.') : null,
            ]);
        };

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
                    numbers.push(control(schema, childPath, schema.label ?? key));
                    continue;
                }
                flush();
                nodes.push(node(schema, childPath, schema.label ?? key, depth));
            }
            flush();
            return nodes;
        };

        const row = (schema: RowSchema, path: Path): VNodeChild[] => {
            const columns = props.props[schema.columns];
            return (Array.isArray(columns) ? columns as Column[] : []).map((column) => control(schema.cell, [...path, column.key], column.label));
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
            if (props.disabled || list.length >= schema.max || !definition.value) return false;
            const next = setAt(props.value, path, [...list, emptyValue(schema.item, props.props)]) as Record<string, unknown>;
            return ruleFailures(definition.value.rules, next, variables.value, 'save').length === 0;
        };

        const list = (schema: ListSchema, path: Path, depth: number): VNodeChild => {
            const items = listOf(path);
            const name = schema.label ?? 'elemento';
            const first = offset(path);
            const resizable = schema.min < schema.max;
            const container = depth === 0 ? 'flex flex-col gap-4 rounded-lg p-4 ring-1 ring-surface-ring' : 'flex flex-col gap-4 rounded-md bg-muted/40 p-4';
            return h('div', { class: 'flex flex-col gap-4' }, [
                ...items.map((_, index) => {
                    const itemPath = [...path, index];
                    const title = `${capitalize(name)} ${first + index + 1}`;
                    const content = schema.item.type === 'object'
                        ? fields(Object.entries(schema.item.fields), itemPath, depth + 1)
                        : schema.item.type === 'row'
                            ? [h('div', { class: 'grid gap-4 sm:grid-cols-2' }, row(schema.item, itemPath))]
                            : [node(schema.item, itemPath, title, depth + 1)];
                    return h('section', { key: index, class: container, 'aria-label': title }, [
                        h('div', { class: 'flex items-center justify-between gap-2' }, [
                            h('h3', { class: depth === 0 ? 'font-semibold' : 'text-sm font-medium' }, title),
                            resizable ? h(Button, {
                                type: 'button', variant: 'ghost', size: 'icon-sm', disabled: props.disabled || items.length <= schema.min,
                                'aria-label': `Quitar ${name} ${first + index + 1}`,
                                onClick: () => write(path, items.filter((__, position) => position !== index)),
                            }, () => h(Trash2, { 'aria-hidden': 'true' })) : null,
                        ]),
                        ...content,
                    ]);
                }),
                resizable ? h(Button, {
                    type: 'button', variant: 'outline', size: 'sm', class: 'w-fit', disabled: !canAdd(path, schema),
                    onClick: () => write(path, [...items, emptyValue(schema.item, props.props)]),
                }, () => [h(Plus, { 'data-icon': 'inline-start', 'aria-hidden': 'true' }), `Agregar ${name}`]) : null,
            ]);
        };

        function node(schema: ValueSchema, path: Path, label: string, depth: number): VNodeChild {
            if (schema.type === 'object') return h('div', { class: 'flex flex-col gap-4' }, fields(Object.entries(schema.fields), path, depth));
            if (schema.type === 'list') return list(schema, path, depth);
            if (schema.type === 'row') return h('div', { class: 'grid gap-4 sm:grid-cols-2' }, row(schema, path));
            return control(schema, path, label);
        }

        const summary = (): VNodeChild => {
            if (!definition.value) return null;
            const results = definition.value.rules.filter((rule) => rule.on === 'submit').flatMap((rule) => ruleResults(rule, props.value, variables.value).filter((result) => result.label !== null));
            if (results.length === 0) return null;
            return h('div', { 'data-block-summary': '', class: 'sticky top-16 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-card px-3 py-2 text-sm shadow-surface ring-1 ring-surface-ring', 'aria-live': 'polite' },
                results.map((result) => h('span', { class: result.ok ? 'text-success' : 'text-destructive' }, `${result.label} ${result.actual} de ${result.expected}`)));
        };

        return () => {
            const block = definition.value;
            if (!block) return h('p', { class: 'text-muted-foreground' }, 'Bloque sin definición en la plantilla');
            return h('div', { id: props.id, class: 'flex flex-col gap-4' }, [summary(), ...fields(Object.entries(block.value), [], 0)]);
        };
    },
});
