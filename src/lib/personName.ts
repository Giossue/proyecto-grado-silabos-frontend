export const NAME_PARTS = [
    { key: 'primer_nombre', label: 'Primer nombre', placeholder: 'Ej. ANA' },
    { key: 'segundo_nombre', label: 'Segundo nombre', placeholder: 'Ej. MARÍA' },
    { key: 'primer_apellido', label: 'Primer apellido', placeholder: 'Ej. PÉREZ' },
    { key: 'segundo_apellido', label: 'Segundo apellido', placeholder: 'Ej. LÓPEZ' },
] as const;

export type NamePartKey = (typeof NAME_PARTS)[number]['key'];
export type NameParts = Record<NamePartKey, string>;

/** Los nombres se escriben en mayúsculas, como en el alta. */
export const upperName = (value: string | number): string => String(value).normalize('NFC').toLocaleUpperCase('es-EC');

/**
 * Reparte un nombre completo guardado en sus cuatro partes: primer y segundo nombre al inicio, el último
 * como segundo apellido y lo que quede en medio como primer apellido (por ejemplo «DE LA CRUZ»).
 */
export const splitName = (full: string): NameParts => {
    const words = full.trim().split(/\s+/u).filter((word) => word !== '');
    if (words.length >= 4) {
        return { primer_nombre: words[0]!, segundo_nombre: words[1]!, primer_apellido: words.slice(2, -1).join(' '), segundo_apellido: words.at(-1)! };
    }

    return {
        primer_nombre: words[0] ?? '',
        segundo_nombre: words[1] ?? '',
        primer_apellido: words[2] ?? '',
        segundo_apellido: '',
    };
};

export const joinName = (parts: NameParts): string =>
    NAME_PARTS.map((part) => parts[part.key].trim()).filter((value) => value !== '').join(' ');
