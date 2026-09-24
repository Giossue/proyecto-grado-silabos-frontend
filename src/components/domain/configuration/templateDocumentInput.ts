import { h } from 'vue';
import type { VNodeChild } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PlanningExpectations, TableLayout } from '@/lib/tableLayout';
import { displayDocumentValue } from '@/lib/templateDocument';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import {
    markStyle,
    textFragments,
} from '@/components/domain/configuration/templateDocumentRender';
import type {
    Context,
    Row,
} from '@/components/domain/configuration/templateDocumentRender';

type Options = {
    props: {
        fields: DocumentField[];
        layout?: TableLayout | null;
        editable?: boolean;
        preview?: boolean;
        planningExpectations?: PlanningExpectations | null;
    };
    prefix: string;
    emit: {
        (event: 'value', key: string, value: string | number | boolean): void;
        (event: 'rows', key: string, rows: Row[]): void;
    };
    setColumn: (context: Context, key: string, value: string | number) => void;
    removeRecord: (field: DocumentField, row: Row) => void;
};

export const createDocumentInput = (options: Options) => {
    return (node: DocumentNode, context: Context, path: string): VNodeChild => {
        const attrs = node.attrs ?? {};
        const key = String(attrs.key);
        const field =
            node.type === 'column'
                ? context.field
                : options.props.fields.find((item) => item.key === key);
        const choice = attrs.choice;
        const isColumn = node.type === 'column';
        const value = isColumn
            ? context.role === 'total'
                ? context.totals?.[key]
                : context.row?.data[key]
            : field?.value;
        const canEdit =
            options.props.editable &&
            field &&
            !field.inherited &&
            field.teacher_editable !== false &&
            context.role !== 'total';
        const label = String(attrs.label ?? field?.label ?? 'Contenido');
        const kind = isColumn
            ? String(attrs.kind)
            : (field?.type ?? String(attrs.kind));
        const change = (value: string | number | boolean) => {
            if (!canEdit) {
                return;
            }

            if (isColumn) {
                options.setColumn(
                    context,
                    key,
                    value === ''
                        ? ''
                        : kind === 'numero'
                          ? Number(value)
                          : String(value),
                );
            } else {
                options.emit('value', key, value);
            }
        };
        const style = markStyle(node, context.insideCell === true);
        const text = displayDocumentValue(value);

        if (!canEdit) {
            if (attrs.listStyle) {
                const items =
                    field?.type === 'repetible' && !isColumn
                        ? (field.rows ?? []).map((row) =>
                              displayDocumentValue(row.data.texto),
                          )
                        : text.split(/\r?\n/).filter((line) => line.trim());

                return h(
                    attrs.listStyle === 'number' ? 'ol' : 'ul',
                    { style },
                    (items.length || !options.props.preview
                        ? items
                        : [label]
                    ).map((item) => h('li', {}, item)),
                );
            }

            const content = choice
                ? text === choice
                    ? 'X'
                    : ''
                : field?.type === 'repetible' && !isColumn
                  ? (field.rows ?? [])
                        .map((row) => displayDocumentValue(row.data.texto))
                        .join('\n')
                  : text;

            return h(
                'span',
                { class: 'contents' },
                textFragments(
                    content || (options.props.preview && !choice ? label : ''),
                    {
                        style,
                        class: 'document-value',
                    },
                ),
            );
        }

        const attributes = {
            id: `${options.prefix}-${path}`,
            'aria-label': label,
            'aria-required': field.required ?? true,
            class: 'document-input',
            style,
        };

        if (choice) {
            return h(
                Button,
                {
                    type: 'button',
                    variant: 'ghost',
                    size: 'sm',
                    'aria-label': `${label}: ${choice}`,
                    'aria-pressed': text === choice,
                    onClick: () => change(String(choice)),
                },
                () => (text === choice ? 'X' : '□'),
            );
        }

        if (!isColumn && kind === 'repetible') {
            const rows = field.rows ?? [];

            return h('div', { class: 'flex flex-col gap-2', style }, [
                ...rows.map((row, index) =>
                    h(
                        'div',
                        {
                            class: 'flex items-start gap-1',
                            key: row.id ?? index,
                        },
                        [
                            h(Textarea, {
                                ...attributes,
                                id: `${options.prefix}-${path}-${index}`,
                                modelValue: String(row.data.texto ?? ''),
                                placeholder: `Ej. ${label}`,
                                'onUpdate:modelValue': (
                                    value: string | number,
                                ) =>
                                    options.emit(
                                        'rows',
                                        key,
                                        rows.map((item, i) =>
                                            i === index
                                                ? {
                                                      ...item,
                                                      data: {
                                                          ...item.data,
                                                          texto: String(value),
                                                      },
                                                  }
                                                : item,
                                        ),
                                    ),
                            }),
                            h(
                                Button,
                                {
                                    variant: 'ghost',
                                    type: 'button',
                                    'aria-label': `Quitar elemento ${index + 1}`,
                                    onClick: () =>
                                        options.removeRecord(field, row),
                                },
                                () => 'Quitar',
                            ),
                        ],
                    ),
                ),
                h(
                    Button,
                    {
                        variant: 'outline',
                        type: 'button',
                        class: 'self-start',
                        onClick: () =>
                            options.emit('rows', key, [
                                ...rows,
                                { id: null, data: { texto: '' } },
                            ]),
                    },
                    () => 'Agregar elemento',
                ),
            ]);
        }

        if (kind === 'seleccion_unica') {
            return h(
                Select,
                {
                    modelValue: text,
                    'onUpdate:modelValue': (value) => change(String(value)),
                },
                () => [
                    h(SelectTrigger, attributes, () =>
                        h(SelectValue, { placeholder: 'Seleccione' }),
                    ),
                    h(SelectContent, {}, () =>
                        h(SelectGroup, {}, () =>
                            (field.options ?? []).map((option) =>
                                h(
                                    SelectItem,
                                    { value: option.value, key: option.value },
                                    () => option.label,
                                ),
                            ),
                        ),
                    ),
                ],
            );
        }

        const control =
            !attrs.listStyle &&
            ['numero', 'fecha', 'texto_corto'].includes(kind)
                ? Input
                : Textarea;
        const columnRole = isColumn
            ? options.props.layout?.columns.find((column) => column.key === key)
                  ?.role
            : null;

        return h(control, {
            ...attributes,
            modelValue: text,
            type:
                kind === 'numero'
                    ? 'number'
                    : kind === 'fecha'
                      ? 'date'
                      : 'text',
            step:
                columnRole === 'week'
                    ? 1
                    : columnRole?.startsWith('hours_')
                      ? 0.01
                      : undefined,
            min: columnRole ? 0 : undefined,
            max:
                columnRole === 'week'
                    ? (options.props.planningExpectations?.teaching_weeks ?? 52)
                    : undefined,
            placeholder: attrs.listStyle
                ? `Ej. ${label}: un elemento por línea`
                : `Ej. ${label}`,
            'onUpdate:modelValue': change,
        });
    };
};
