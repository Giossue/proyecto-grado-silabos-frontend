import type { DocumentField } from '@/lib/templateDocument';

const samples: Record<string, string> = {
    discapacidad_tiene: 'No',
    discapacidad_tipo: 'No aplica.',
    discapacidad_adaptacion: 'No aplica.',
    formacion_experiencia:
        'Formación y experiencia en el área de la asignatura.',
    descripcion: 'Introducción a los fundamentos de la asignatura.',
    objetivo_general: 'Aplicar los conceptos estudiados a problemas prácticos.',
    estado_revision: 'Pendiente de revisión.',
};
const sampleText = (key: string): string | undefined =>
    Object.hasOwn(samples, key) ? samples[key] : undefined;

const sampleValue = (field: DocumentField): unknown => {
    const sample = sampleText(field.key);

    if (field.type === 'texto_libre') {
        return {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: sample ?? 'Texto de ejemplo.' }] }],
        };
    }

    if (sample !== undefined) {
        return sample;
    }

    switch (field.type) {
        case 'numero':
        case 'calculo':
            return 2;
        case 'fecha':
            return '2026-03-01';
        case 'booleano':
            return false;
        case 'seleccion_unica':
            return field.options?.map((option) => option.value).join('|') === 'Sí|No'
                ? 'Sí o No'
                : (field.options?.[0]?.value ?? 'Opción de ejemplo');
        case 'seleccion_multiple':
            return field.options?.length ? [field.options[0].value] : [];
        default:
            return 'Texto de ejemplo.';
    }
};

export const templatePreviewFields = (fields: DocumentField[]): DocumentField[] =>
    fields.map((field) => ({ ...field, value: sampleValue(field) }));
