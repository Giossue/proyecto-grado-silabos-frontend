import { isFreeTextDocument, freeTextPlain } from '@/components/domain/syllabus/freeTextRender';
import { tableColumns, tableRows } from '@/components/domain/fieldTypes/tableField';
import type { TableAxisItem } from '@/types/configuration';

/** Fuentes de `automatico` (AutomaticFieldType::SOURCES del backend). */
export const AUTOMATIC_SOURCES = [{ value: 'identification_card', label: 'Tabla de identificación de la asignatura' }];

/** Clave nueva `prefijo_n` que no choca con las existentes (las claves de filas y columnas no cambian al renombrar). */
export const nextAxisKey = (items: TableAxisItem[], prefix: string): string => {
    const used = new Set(items.map((item) => item.key));
    let n = items.length + 1;
    while (used.has(`${prefix}_${n}`)) n += 1;
    return `${prefix}_${n}`;
};

const axisProblem = (items: TableAxisItem[], noun: string): string | null =>
    items.length === 0 ? `La tabla necesita al menos una ${noun}.`
        : items.some((item) => item.label.trim() === '') ? `Escriba el nombre de cada ${noun}.`
            : null;

export const validateTableConfig = (config: Record<string, unknown>): string | null =>
    axisProblem(tableColumns({ config }), 'columna') ?? axisProblem(tableRows({ config }), 'fila');

export const validateAutomaticConfig = (config: Record<string, unknown>): string | null =>
    AUTOMATIC_SOURCES.some((source) => source.value === config.source) ? null : 'Elija el dato automático.';

export const validateFixedConfig = (config: Record<string, unknown>): string | null => {
    const content = config.content;
    const empty = !isFreeTextDocument(content) || (freeTextPlain(content).trim() === '' && !JSON.stringify(content).includes('"table"'));
    return empty ? 'Escriba el texto fijo; no puede quedar vacío.' : null;
};
