import type { DocumentNode } from '@/lib/templateDocument';

export type FieldResponsible = 'docente' | 'coordinacion' | 'institucional';
export type DocumentField = {
    id?: string;
    key: string;
    label: string;
    help?: string | null;
    quien_llena: FieldResponsible;
    value: DocumentNode | null;
    document?: DocumentNode | null;
    teacher_editable?: boolean;
    required?: boolean;
};
export const FIELD_RESPONSIBLES: Array<{ value: FieldResponsible; label: string; hint: string }> = [
    { value: 'docente', label: 'Docente', hint: 'Escribe sobre el contenido inicial de la plantilla.' },
    { value: 'coordinacion', label: 'Coordinación', hint: 'Lo llena en la ficha de la asignatura. El docente lo consulta.' },
    { value: 'institucional', label: 'Fijo', hint: 'Contenido de la plantilla, igual para todos y de solo lectura.' },
];
export const responsibleLabel = (value: FieldResponsible): string => FIELD_RESPONSIBLES.find((item) => item.value === value)?.label ?? value;
export const emptyDocument = (): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph' }] });
