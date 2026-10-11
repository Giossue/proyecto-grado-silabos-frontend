export type DocumentNode = {
    type: string;
    text?: string;
    attrs?: Record<
        string,
        string | number | boolean | null | number[] | string[] | Record<string, unknown>
    >;
    marks?: { type: string; attrs?: Record<string, string | null> }[];
    content?: DocumentNode[];
};
export type TemplateVariable = { key: string; label: string; sample: string; type?: 'texto' | 'lista' | 'tabla' };
export const paragraph = (content: DocumentNode[] = []): DocumentNode => ({
    type: 'paragraph',
    content,
});
export const nodesOfType = (
    doc: DocumentNode,
    type: string,
): DocumentNode[] => [
    ...(doc.type === type ? [doc] : []),
    ...(doc.content ?? []).flatMap((child) => nodesOfType(child, type)),
];

export type BlockKind = 'si_no' | 'repetible' | 'identificacion' | 'unidades' | 'evaluacion';
export type BlockColumn = { key: string; label: string };
export type BlockProps = { question?: string; label?: string; columns: BlockColumn[] };
export type UnitWeek = { contenidos: string; acd_h: string; ape_h: string; aa_h: string; acd: string; ape: string; aa: string; evaluacion: string };
export type PlanningUnit = { nombre: string; resultado: string; semanas: UnitWeek[] };
export type BlockValue = { answer?: 'si' | 'no' | null; rows: Array<Record<string, string>>; disability?: { answer: 'si' | 'no' | null; type: string; description: string }; units?: PlanningUnit[] };

export const PLANNING_WEEKS = 16;
export const PLANNING_UNITS = 4;
export const emptyWeek = (): UnitWeek => ({ contenidos: '', acd_h: '', ape_h: '', aa_h: '', acd: '', ape: '', aa: '', evaluacion: '' });
const textOf = (value: unknown): string => typeof value === 'string' ? value : '';
const defaultUnits = (): PlanningUnit[] => Array.from({ length: PLANNING_UNITS }, () => ({ nombre: '', resultado: '', semanas: Array.from({ length: PLANNING_WEEKS / PLANNING_UNITS }, emptyWeek) }));

/** Cuatro unidades que se reparten las 16 semanas; sin datos, cuatro semanas por unidad (igual que el servidor). */
export const planningUnits = (raw: unknown): PlanningUnit[] => {
    if (!Array.isArray(raw)) return defaultUnits();

    return Array.from({ length: PLANNING_UNITS }, (_, index) => {
        const unit = (raw[index] ?? {}) as Partial<PlanningUnit>;
        const weeks = Array.isArray(unit.semanas) ? unit.semanas : [];

        return {
            nombre: textOf(unit.nombre),
            resultado: textOf(unit.resultado),
            semanas: weeks.map((week) => ({ ...emptyWeek(), ...Object.fromEntries(Object.keys(emptyWeek()).map((key) => [key, textOf((week as Record<string, unknown>)[key])])) })),
        };
    });
};

export const hoursOf = (text: string): number => Number.parseFloat(text.trim().replace(',', '.')) || 0;
export const plannedHours = (units: PlanningUnit[]): { acd: number; ape: number; aa: number } => {
    const total = { acd: 0, ape: 0, aa: 0 };
    for (const week of units.flatMap((unit) => unit.semanas)) {
        total.acd += hoursOf(week.acd_h);
        total.ape += hoursOf(week.ape_h);
        total.aa += hoursOf(week.aa_h);
    }

    return total;
};

export const BLOCK_KINDS: Array<{ kind: BlockKind; label: string }> = [
    { kind: 'si_no', label: 'Pregunta Sí/No' },
    { kind: 'repetible', label: 'Lista de filas repetibles' },
];
export const MAX_BLOCK_COLUMNS = 8;

export const blockOf = (node: DocumentNode): { kind: BlockKind; props: BlockProps; value: BlockValue } => {
    const props = (node.attrs?.props ?? {}) as Partial<BlockProps>;
    const value = (node.attrs?.value ?? {}) as Partial<BlockValue>;

    const kind: BlockKind = (['repetible', 'identificacion', 'unidades', 'evaluacion'] as const).find((item) => item === node.attrs?.kind) ?? 'si_no';

    return {
        kind,
        props: { ...props, columns: Array.isArray(props.columns) ? props.columns : [] },
        value: {
            answer: value.answer ?? null,
            rows: Array.isArray(value.rows) ? value.rows : [],
            ...(kind === 'identificacion' ? { disability: value.disability ?? { answer: null, type: '', description: '' } } : {}),
            ...(kind === 'unidades' ? { units: planningUnits(value.units) } : {}),
        },
    };
};

export const newBlock = (kind: BlockKind): DocumentNode => ({
    type: 'documentBlock',
    attrs: {
        kind,
        props: kind === 'si_no'
            ? { question: 'Pregunta', columns: [] }
            : { label: '', columns: [{ key: 'columna', label: 'Columna' }] },
        value: kind === 'si_no' ? { answer: null, rows: [] } : { rows: [] },
    },
});

export const blockPlain = (node: DocumentNode): string => {
    const { kind, props, value } = blockOf(node);
    if (kind === 'identificacion') return 'Identificación institucional';
    if (kind === 'evaluacion') return 'Evaluación de los aprendizajes';
    if (kind === 'unidades') return (value.units ?? []).flatMap((unit) => [unit.nombre, unit.resultado, ...unit.semanas.flatMap((week) => Object.values(week))]).join(' ').trim();
    if (kind === 'si_no') return `${props.question ?? ''} ${value.answer === 'si' ? 'Sí' : value.answer === 'no' ? 'No' : ''}`.trim();

    return props.label ?? '';
};

export const IDENTIFICATION_SLOTS = ['discapacidad_si', 'discapacidad_no', 'discapacidad_tipo', 'discapacidad_descripcion'] as const;
export type IdentificationSlot = (typeof IDENTIFICATION_SLOTS)[number];
export type Disability = NonNullable<BlockValue['disability']>;

export const identificationSlotText = (slot: string, disability: Disability): string => ({
    discapacidad_si: disability.answer === 'si' ? 'X' : '',
    discapacidad_no: disability.answer === 'no' ? 'X' : '',
    discapacidad_tipo: disability.type,
    discapacidad_descripcion: disability.description,
}[slot] ?? '');
