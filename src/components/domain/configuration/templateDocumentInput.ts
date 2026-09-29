import { h } from 'vue';
import type { VNodeChild } from 'vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
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
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { freeTextPlain, isFreeTextDocument, renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import { displayDocumentValue } from '@/lib/templateDocument';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import {
    markStyle,
    textFragments,
} from '@/components/domain/configuration/templateDocumentRender';
import type { Context } from '@/components/domain/configuration/templateDocumentRender';

type Options = {
    props: {
        fields: DocumentField[];
        editable?: boolean;
        preview?: boolean;
    };
    prefix: string;
    emit: (event: 'value', key: string, value: string | number | boolean | string[] | DocumentNode) => void;
};

export const createDocumentInput = (options: Options) => {
    return (node: DocumentNode, context: Context, path: string): VNodeChild => {
        const attrs = node.attrs ?? {};
        const key = String(attrs.key);
        const field = options.props.fields.find((item) => item.key === key);
        const choice = attrs.choice;
        const value = field?.value;
        const canEdit =
            options.props.editable &&
            field &&
            !field.inherited &&
            field.teacher_editable !== false;
        const label = String(attrs.label ?? field?.label ?? 'Contenido');
        const kind = field?.type ?? String(attrs.kind);
        const change = (value: string | number | boolean) => {
            if (canEdit) {
                options.emit('value', key, value);
            }
        };
        // Texto libre (I-156): el docente escribe con su propio formato.
        if (kind === 'texto_libre') {
            if (!canEdit) {
                return isFreeTextDocument(value) && freeTextPlain(value).trim() !== ''
                    ? renderFreeText(value)
                    : h('span', { class: 'document-value' }, options.props.preview ? label : '');
            }

            return h(FreeTextEditor, {
                id: `${options.prefix}-${path}`,
                label,
                modelValue: isFreeTextDocument(value) ? value : null,
                'onUpdate:modelValue': (document: DocumentNode) => options.emit('value', key, document),
            });
        }
        const style = markStyle(node, context.insideCell === true);
        const text = displayDocumentValue(value);

        if (!canEdit) {
            if (attrs.listStyle) {
                const items = text.split(/\r?\n/).filter((line) => line.trim());

                return h(
                    attrs.listStyle === 'number' ? 'ol' : 'ul',
                    { style },
                    (items.length || !options.props.preview
                        ? items
                        : [label]
                    ).map((item) => h('li', {}, item)),
                );
            }

            const content = choice ? (text === choice ? 'X' : '') : text;

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

        // ?Docente (I-155): Sí o No con dos botones, fácil de ver también dentro de una tabla.
        const choices = (field.options ?? []).map((option) => option.value);
        if (kind === 'seleccion_unica' && choices.join('|') === 'Sí|No') {
            return h('span', { class: 'inline-flex gap-1', role: 'radiogroup', 'aria-label': label }, ['Sí', 'No'].map((option) => h(
                Button,
                {
                    key: option,
                    type: 'button',
                    size: 'sm',
                    variant: text === option ? 'default' : 'outline',
                    role: 'radio',
                    'aria-checked': text === option,
                    onClick: () => change(option),
                },
                () => option,
            )));
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

        if (kind === 'seleccion_multiple') {
            const chosen = Array.isArray(value) ? value.map(String) : [];
            return h(FieldSet, { style }, () => [
                h(FieldLegend, { class: 'sr-only', required: field.required }, () => label),
                ...(field.options ?? []).map((option, index) => {
                    const id = `${options.prefix}-${path}-${index}`;
                    return h(Field, { key: option.value, orientation: 'horizontal' }, () => [
                        h(Checkbox, { id, modelValue: chosen.includes(option.value), 'onUpdate:modelValue': (checked: boolean | 'indeterminate') => {
                            options.emit('value', key, checked === true ? [...new Set([...chosen, option.value])] : chosen.filter((item) => item !== option.value));
                        } }),
                        h(FieldLabel, { for: id }, () => option.label),
                    ]);
                }),
                !(field.options ?? []).length ? h('p', { class: 'text-sm text-muted-foreground' }, 'No hay opciones curriculares disponibles para esta asignatura.') : null,
            ]);
        }

        const control =
            !attrs.listStyle &&
            ['numero', 'fecha', 'texto_corto'].includes(kind)
                ? Input
                : Textarea;
        return h(control, {
            ...attributes,
            modelValue: text,
            type:
                kind === 'numero'
                    ? 'number'
                    : kind === 'fecha'
                      ? 'date'
                      : 'text',
            // Un número no lleva «Ej.»: en una casilla angosta solo estorba.
            placeholder:
                kind === 'numero'
                    ? undefined
                    : attrs.listStyle
                      ? `Ej. ${label}: un elemento por línea`
                      : `Ej. ${label}`,
            'onUpdate:modelValue': change,
        });
    };
};
