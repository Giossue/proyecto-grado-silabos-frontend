import type { TypedField } from '@/types/configuration';

/** El backend serializa una configuración vacía como `[]`; aquí siempre es un objeto. */
export const fieldConfig = (field: Pick<TypedField, 'config'>): Record<string, unknown> =>
    field.config !== null && typeof field.config === 'object' && !Array.isArray(field.config) ? field.config : {};
