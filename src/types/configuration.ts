import type { DocumentNode } from '@/lib/templateDocument';

/** Tipos de campo del registro del backend (config/field_types.php), I-195. */
export type FieldTypeKey = 'texto' | 'ficha' | 'tabla' | 'automatico' | 'fijo';

export type TableAxisItem = { key: string; label: string };
/** Valor de `tabla`: fila → columna → texto. */
export type TableValue = Record<string, Record<string, string>>;

export type FieldTypeConfigs = {
    texto: Record<string, never>;
    ficha: { adjustable: boolean };
    tabla: { columns: TableAxisItem[]; rows: TableAxisItem[] };
    automatico: { source: 'identification_card' };
    fijo: { content: DocumentNode };
};

/** Campo de un sílabo (borrador del docente o fotografía de una revisión) tal como lo consumen los componentes por tipo. */
export type TypedField = {
    id?: string;
    key: string;
    label: string;
    help?: string | null;
    type: string;
    config?: Record<string, unknown> | unknown[] | null;
    value: unknown;
    /** Documento ya armado por el servidor (cuadrícula oficial de identificación). */
    document?: DocumentNode | null;
    teacher_editable?: boolean;
    inherited?: boolean;
    required?: boolean;
    legacy?: boolean;
};
