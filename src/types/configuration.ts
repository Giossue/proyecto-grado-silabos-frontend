import type { DocumentNode } from '@/lib/templateDocument';

export type FieldResponsible = 'docente' | 'coordinacion' | 'institucional';
export type DocumentField = {
    id?: string;
    key: string;
    label: string;
    quien_llena: FieldResponsible;
    value: DocumentNode | null;
    document?: DocumentNode | null;
    template?: DocumentNode;
    teacher_editable?: boolean;
    required?: boolean;
};
export const FIELD_RESPONSIBLES: Array<{ value: FieldResponsible; label: string; hint: string }> = [
    { value: 'docente', label: 'Docente', hint: 'Completa las respuestas; el texto y el formato de la plantilla se conservan.' },
    { value: 'coordinacion', label: 'Carrera', hint: 'Lo llena la carrera en la ficha de la asignatura. El docente lo consulta.' },
    { value: 'institucional', label: 'Fijo', hint: 'Contenido de la plantilla, igual para todos y de solo lectura.' },
];
export const responsibleLabel = (value: FieldResponsible): string => FIELD_RESPONSIBLES.find((item) => item.value === value)?.label ?? value;
export const emptyDocument = (): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph' }] });
