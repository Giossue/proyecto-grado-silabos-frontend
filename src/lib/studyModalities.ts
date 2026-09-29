export const STUDY_MODALITIES = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'semipresencial', label: 'Semipresencial' },
    { value: 'en_linea', label: 'En línea' },
    { value: 'a_distancia', label: 'A distancia' },
    { value: 'hibrida', label: 'Híbrida' },
] as const;

export const INHERITED_MODALITY = 'heredada';

export const modalityLabel = (
    value: string | null | undefined,
): string | null =>
    STUDY_MODALITIES.find((item) => item.value === value)?.label ?? null;

