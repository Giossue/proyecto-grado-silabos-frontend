import type { Component } from 'vue';
import { ClipboardList, Lock, Table2, Type, Zap } from '@lucide/vue';
import AutomaticFieldBuilder from '@/components/domain/fieldTypes/AutomaticFieldBuilder.vue';
import AutomaticFieldEditor from '@/components/domain/fieldTypes/AutomaticFieldEditor.vue';
import AutomaticFieldView from '@/components/domain/fieldTypes/AutomaticFieldView.vue';
import FixedFieldBuilder from '@/components/domain/fieldTypes/FixedFieldBuilder.vue';
import FixedFieldEditor from '@/components/domain/fieldTypes/FixedFieldEditor.vue';
import FixedFieldView from '@/components/domain/fieldTypes/FixedFieldView.vue';
import ProfileFieldBuilder from '@/components/domain/fieldTypes/ProfileFieldBuilder.vue';
import ProfileFieldEditor from '@/components/domain/fieldTypes/ProfileFieldEditor.vue';
import ProfileFieldView from '@/components/domain/fieldTypes/ProfileFieldView.vue';
import TableFieldBuilder from '@/components/domain/fieldTypes/TableFieldBuilder.vue';
import TableFieldEditor from '@/components/domain/fieldTypes/TableFieldEditor.vue';
import TableFieldView from '@/components/domain/fieldTypes/TableFieldView.vue';
import TextFieldBuilder from '@/components/domain/fieldTypes/TextFieldBuilder.vue';
import TextFieldEditor from '@/components/domain/fieldTypes/TextFieldEditor.vue';
import TextFieldView from '@/components/domain/fieldTypes/TextFieldView.vue';
import { validateAutomaticConfig, validateFixedConfig, validateTableConfig } from '@/components/domain/fieldTypes/builderConfig';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { isTableEmpty } from '@/components/domain/fieldTypes/tableField';
import { freeTextPlain, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import type { FieldTypeConfigs, FieldTypeKey, TypedField } from '@/types/configuration';

export type FieldTypeEntry<K extends FieldTypeKey = FieldTypeKey> = {
    label: string;
    icon: Component;
    /** Cómo lo nombra Administración al elegir el tipo de un campo. */
    adminLabel: string;
    adminHint: string;
    /** Pieza que configura el tipo en el constructor de plantilla. */
    BuilderComponent: Component;
    /** Mensaje si la configuración no se puede guardar; null si es válida. */
    validateConfig: (config: Record<string, unknown>) => string | null;
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
        adminLabel: 'Lo escribe el docente',
        adminHint: 'El docente lo redacta en su sílabo.',
        BuilderComponent: TextFieldBuilder,
        validateConfig: () => null,
        EditorComponent: TextFieldEditor,
        ViewComponent: TextFieldView,
        defaultConfig: {},
        teacherEditable: () => true,
        isEmpty: textEmpty,
    },
    ficha: {
        label: 'Ficha de la asignatura',
        icon: ClipboardList,
        adminLabel: 'Lo escribe Coordinación en la ficha de la asignatura',
        adminHint: 'Se escribe una vez por asignatura y pasa al sílabo.',
        BuilderComponent: ProfileFieldBuilder,
        validateConfig: () => null,
        EditorComponent: ProfileFieldEditor,
        ViewComponent: ProfileFieldView,
        defaultConfig: { adjustable: false },
        teacherEditable: (config) => config.adjustable === true,
        isEmpty: textEmpty,
    },
    tabla: {
        label: 'Tabla',
        icon: Table2,
        adminLabel: 'Tabla de filas fijas',
        adminHint: 'Define columnas y filas; el docente llena las celdas.',
        BuilderComponent: TableFieldBuilder,
        validateConfig: validateTableConfig,
        EditorComponent: TableFieldEditor,
        ViewComponent: TableFieldView,
        defaultConfig: { columns: [{ key: 'columna_1', label: 'Columna 1' }], rows: [{ key: 'fila_1', label: 'Fila 1' }] },
        teacherEditable: () => true,
        isEmpty: (value) => isTableEmpty(value),
    },
    automatico: {
        label: 'Dato automático',
        icon: Zap,
        adminLabel: 'Dato automático',
        adminHint: 'Se completa solo con datos de la asignatura.',
        BuilderComponent: AutomaticFieldBuilder,
        validateConfig: validateAutomaticConfig,
        EditorComponent: AutomaticFieldEditor,
        ViewComponent: AutomaticFieldView,
        defaultConfig: { source: 'identification_card' },
        teacherEditable: () => false,
        isEmpty: () => false,
    },
    fijo: {
        label: 'Texto fijo',
        icon: Lock,
        adminLabel: 'Texto fijo igual para todos',
        adminHint: 'Administración lo escribe aquí y el docente no lo cambia.',
        BuilderComponent: FixedFieldBuilder,
        validateConfig: validateFixedConfig,
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
export const sectionFields = <F>(section: { fields?: F[]; blocks?: Array<{ fields: F[] }> }): F[] =>
    section.fields ?? (section.blocks ?? []).flatMap((block) => block.fields);

export const canTeacherEdit = (field: TypedField): boolean => {
    const entry = fieldTypeEntry(field.type);
    return entry !== null && entry.teacherEditable(fieldConfig(field));
};
