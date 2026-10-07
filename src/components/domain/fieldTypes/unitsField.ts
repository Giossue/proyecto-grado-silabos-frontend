import type { UnitsValue, UnitWeek } from '@/types/configuration';

export const MAX_UNITS = 10;
export const MAX_WEEKS = 16;

export const emptyWeek = (): UnitWeek => ({ contenidos: '', acd_h: '', ape_h: '', aa_h: '', acd: '', ape: '', aa: '', evaluacion: '' });

export const unitsOf = (value: unknown): UnitsValue =>
    Array.isArray(value)
        ? value.filter((unit): unit is UnitsValue[number] => typeof unit === 'object' && unit !== null).map((unit) => ({
            nombre: typeof unit.nombre === 'string' ? unit.nombre : '',
            resultado: typeof unit.resultado === 'string' ? unit.resultado : '',
            semanas: Array.isArray(unit.semanas) ? unit.semanas.map((week) => ({ ...emptyWeek(), ...(week as Partial<UnitWeek>) })) : [],
        }))
        : [];

export const totalWeeks = (units: UnitsValue): number => units.reduce((sum, unit) => sum + unit.semanas.length, 0);

/** Número de la primera semana de cada unidad: la numeración continúa entre unidades. */
export const firstWeek = (units: UnitsValue, index: number): number => units.slice(0, index).reduce((sum, unit) => sum + unit.semanas.length, 0) + 1;

const hours = (text: string): number => {
    const parsed = Number.parseFloat(text.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
};

export const unitTotals = (unit: UnitsValue[number]): { acd: number; ape: number; aa: number } => ({
    acd: unit.semanas.reduce((sum, week) => sum + hours(week.acd_h), 0),
    ape: unit.semanas.reduce((sum, week) => sum + hours(week.ape_h), 0),
    aa: unit.semanas.reduce((sum, week) => sum + hours(week.aa_h), 0),
});

export const formatHours = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export const isUnitsEmpty = (value: unknown): boolean =>
    unitsOf(value).every((unit) => unit.nombre.trim() === '' && unit.resultado.trim() === ''
        && unit.semanas.every((week) => Object.values(week).every((text) => String(text).trim() === '')));
