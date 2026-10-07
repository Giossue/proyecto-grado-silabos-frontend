import type { Component } from 'vue';
import { ClipboardList, Lock, Table2, Type, Zap } from '@lucide/vue';
import AutomaticFieldEditor from '@/components/domain/fieldTypes/AutomaticFieldEditor.vue';
import AutomaticFieldView from '@/components/domain/fieldTypes/AutomaticFieldView.vue';
import FixedFieldEditor from '@/components/domain/fieldTypes/FixedFieldEditor.vue';
import FixedFieldView from '@/components/domain/fieldTypes/FixedFieldView.vue';
import ProfileFieldEditor from '@/components/domain/fieldTypes/ProfileFieldEditor.vue';
import ProfileFieldView from '@/components/domain/fieldTypes/ProfileFieldView.vue';
import TableFieldEditor from '@/components/domain/fieldTypes/TableFieldEditor.vue';
import TableFieldView from '@/components/domain/fieldTypes/TableFieldView.vue';
import TextFieldEditor from '@/components/domain/fieldTypes/TextFieldEditor.vue';
import TextFieldView from '@/components/domain/fieldTypes/TextFieldView.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { isTableEmpty } from '@/components/domain/fieldTypes/tableField';
import { freeTextPlain, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import type { FieldTypeConfigs, FieldTypeKey, TypedField } from '@/types/configuration';

export type FieldTypeEntry<K extends FieldTypeKey = FieldTypeKey> = {
    label: string;
    icon: Component;
    EditorComponent: Component;
    ViewComponent: Component;
    defaultConfig: FieldTypeConfigs[K];
    /** ¿Lo puede escribir el docente en el sílabo? */
    teacherEditable: (config: Record<string, unknown>) => boolean;
    isEmpty: (value: unknown, config: Record<string, unknown>) => boolean;
};

const textEmpty = (value: unknown): boolean => !isFreeTextDocument(value) || (freeTextPlain(value).trim() === '' && !JSON.stringify(value).includes('"table"'));

/** Un tipo nuevo se agrega aquí y en config/field_types.php del backend (la prueba de paridad lo exige). */
export const fieldTypeRegistry: { [K in FieldTypeKey]: FieldTypeEntry<K> } = {
    texto: {
        label: 'Texto',
        icon: Type,
        EditorComponent: TextFieldEditor,
        ViewComponent: TextFieldView,
        defaultConfig: {},
        teacherEditable: () => true,
        isEmpty: textEmpty,
    },
    ficha: {
        label: 'Ficha de la asignatura',
        icon: ClipboardList,
        EditorComponent: ProfileFieldEditor,
        ViewComponent: ProfileFieldView,
        defaultConfig: { adjustable: false },
        teacherEditable: (config) => config.adjustable === true,
        isEmpty: textEmpty,
    },
    tabla: {
        label: 'Tabla',
        icon: Table2,
        EditorComponent: TableFieldEditor,
        ViewComponent: TableFieldView,
        defaultConfig: { columns: [{ key: 'columna_1', label: 'Columna 1' }], rows: [{ key: 'fila_1', label: 'Fila 1' }] },
        teacherEditable: () => true,
        isEmpty: (value) => isTableEmpty(value),
    },
    automatico: {
        label: 'Dato automático',
        icon: Zap,
        EditorComponent: AutomaticFieldEditor,
        ViewComponent: AutomaticFieldView,
        defaultConfig: { source: 'identification_card' },
        teacherEditable: () => false,
        isEmpty: () => false,
    },
    fijo: {
        label: 'Texto fijo',
        icon: Lock,
        EditorComponent: FixedFieldEditor,
        ViewComponent: FixedFieldView,
        defaultConfig: { content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        teacherEditable: () => false,
        isEmpty: () => false,
    },
};

export const fieldTypeKeys = Object.keys(fieldTypeRegistry) as FieldTypeKey[];

export const fieldTypeEntry = (type: string): FieldTypeEntry | null =>
    Object.hasOwn(fieldTypeRegistry, type) ? fieldTypeRegistry[type as FieldTypeKey] as FieldTypeEntry : null;

/** Campos de una sección: v7 trae `fields`; las fotografías anteriores solo `blocks`. */
export const sectionFields = <T extends { fields?: T[] | unknown }>(section: { fields?: T[]; blocks?: Array<{ fields: T[] }> }): T[] =>
    section.fields ?? (section.blocks ?? []).flatMap((block) => block.fields);

export const canTeacherEdit = (field: TypedField): boolean => {
    const entry = fieldTypeEntry(field.type);
    return entry !== null && entry.teacherEditable(fieldConfig(field));
};
