import { MarkerType } from '@vue-flow/core';
import type { Edge, Node } from '@vue-flow/core';
import type {
    CurriculumBuilderProps,
    CurriculumBuilderSubject,
} from '@/types/academic';

export type CurriculumRequirement = CurriculumBuilderProps['requirements'][number];

// Cada unidad de organización curricular recibe un color en la leyenda y en los
// encabezados ACD/APE/… de sus tarjetas. El orden sigue al listado de unidades.
export const UNIT_PALETTE = [
    { backgroundColor: 'var(--curriculum-unit-1-background)', color: 'var(--curriculum-unit-1-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-2-background)', color: 'var(--curriculum-unit-2-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-3-background)', color: 'var(--curriculum-unit-3-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-4-background)', color: 'var(--curriculum-unit-4-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-5-background)', color: 'var(--curriculum-unit-5-foreground)' },
];
export const FALLBACK_UNIT_STYLE = {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
};


const ROMAN_NUMERALS = [
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
] as const;

export const toRoman = (value: number): string => {
    let remaining = value;
    let roman = '';
    ROMAN_NUMERALS.forEach(([symbol, amount]) => {
        while (remaining >= amount) {
            roman += symbol;
            remaining -= amount;
        }
    });

    return roman || String(value);
};

// El carril se dibuja un 30 % más bajo que los 340 px originales; con menos aire
// sobrante, las tarjetas se centran en él en vez de colgar del borde superior.
export const laneHeight = 238;
export const laneInset = 16;
// La tarjeta incluye la fila de modalidad sobre las horas.
export const subjectHeight = 158;
export const addSubjectHeight = 36;
export const subjectOffset = Math.round(
    (laneHeight - laneInset - subjectHeight) / 2,
);
export const addSubjectOffset = Math.round(
    (laneHeight - laneInset - addSubjectHeight) / 2,
);
export const laneStart = 109;
// Tarjeta de 274 px (un 7 % más ancha que las 256 originales) más 34 px de aire.
export const subjectStep = 308;
// El viewport termina donde termina la malla. El margen permite respirar alrededor
// del primer y último ciclo sin dejar que el lienzo navegue hacia espacio infinito.
export const navigationPadding = 48;

type CurriculumNodeOptions = Pick<
    CurriculumBuilderProps,
    'career' | 'curriculum' | 'fixedFields'
> & {
    subjectsForCycle: (cycle: number) => CurriculumBuilderSubject[];
    unitStyleFor: (unit: string | null | undefined) => (typeof UNIT_PALETTE)[number];
    laneWidth: number;
    editable: boolean;
    hasOpenEditor: boolean;
    savingLayout: boolean;
    draggingSubjectId: string | undefined;
    onEdit: (subjectId: string) => void;
    onSaved: (message?: string) => void;
};

export const buildCurriculumNodes = (options: CurriculumNodeOptions): Node[] => {
    const nodes: Node[] = [];

    for (let cycle = 1; cycle <= options.curriculum.cycle_count; cycle += 1) {
        const cycleSubjects = options.subjectsForCycle(cycle);
        nodes.push({
            id: `cycle-${cycle}`,
            type: 'cycle',
            position: { x: 0, y: (cycle - 1) * laneHeight },
            data: {
                cycle,
                level: toRoman(cycle),
                subjectCount: cycleSubjects.length,
                totalHours: cycleSubjects.reduce(
                    (total, subject) => total + (subject.total_hours ?? 0),
                    0,
                ),
            },
            draggable: false,
            selectable: false,
            connectable: false,
            focusable: false,
            style: {
                width: `${options.laneWidth}px`,
                height: `${laneHeight - laneInset}px`,
            },
            zIndex: -1,
        });

        let x = laneStart;
        cycleSubjects.forEach((subject) => {
            const cycleY = (cycle - 1) * laneHeight + subjectOffset;
            nodes.push({
                id: subject.id,
                type: 'subject',
                position: {
                    x,
                    y: cycleY,
                },
                data: {
                    career: options.career,
                    curriculum: options.curriculum,
                    fixedFields: options.fixedFields,
                    subject,
                    unitStyle: options.unitStyleFor(subject.organization_unit),
                    editable: options.editable,
                    onEdit: () => options.onEdit(subject.id),
                    onSaved: options.onSaved,
                },
                draggable: options.editable && !options.hasOpenEditor && !options.savingLayout,
                // Vue Flow descuenta las dimensiones medidas del nodo del límite
                // superior. Darle solo la coordenada final de la tarjeta la empuja
                // fuera del carril al empezar a arrastrarla.
                extent: [
                    [laneStart, cycleY],
                    [laneStart + cycleSubjects.length * subjectStep, cycleY + laneHeight - laneInset],
                ],
                connectable: options.editable && !options.hasOpenEditor,
                selectable: false,
                zIndex: options.draggingSubjectId === subject.id ? 10 : 0,
            });
            x += subjectStep;
        });

        if (!options.editable) {
            continue;
        }

        nodes.push({
            id: `add-subject-${cycle}`,
            type: 'addSubject',
            position: {
                x,
                y: (cycle - 1) * laneHeight + addSubjectOffset,
            },
            data: {
                cycle,
                disabled: options.hasOpenEditor || options.savingLayout,
            },
            draggable: false,
            selectable: false,
            connectable: false,
        });
    }

    return nodes;
};

// Reparte las conexiones que comparten conector. La primera se queda en el centro de
// la materia —que es de donde se espera que salga una línea— y las siguientes se
// apartan hacia un lado para no pisarla.
const EDGE_SPACING = 18;

/*
 * Reparto de las líneas en cada conector. Por abajo salen prerrequisitos y
 * correquisitos hacia otros niveles; por arriba llegan todas las líneas y, además,
 * apoyan sus dos extremos los correquisitos del mismo nivel (van por encima). Todo lo
 * que toca el borde superior de una tarjeta se reparte en un mismo grupo: si el extremo
 * de salida de un correquisito se repartiera aparte, caería sobre una llegada.
 */
const edgeOffsets = (
    requirements: CurriculumRequirement[],
    subjectById: Map<string, CurriculumBuilderSubject>,
    sameLevelIds: Set<string>,
): Map<string, { source: number; target: number; topShared: boolean }> => {
    const orderKey = (subjectId: string): number => {
        const subject = subjectById.get(subjectId);

        return subject ? (subject.cycle ?? 0) * 1000 + subject.position : 0;
    };
    type End = { requirement: CurriculumRequirement; end: 'source' | 'target' };
    const bottom = new Map<string, End[]>();
    const top = new Map<string, End[]>();
    const push = (map: Map<string, End[]>, key: string, end: End): void => {
        map.set(key, [...(map.get(key) ?? []), end]);
    };
    requirements.forEach((requirement) => {
        push(top, requirement.subject_id, { requirement, end: 'target' });

        if (sameLevelIds.has(requirement.id)) {
            push(top, requirement.requirement_id, {
                requirement,
                end: 'source',
            });
        } else {
            push(bottom, requirement.requirement_id, {
                requirement,
                end: 'source',
            });
        }
    });
    const counterpart = (end: End): string =>
        end.end === 'target'
            ? end.requirement.requirement_id
            : end.requirement.subject_id;
    const result = new Map<
        string,
        { source: number; target: number; topShared: boolean }
    >();
    const entry = (id: string) => {
        const current = result.get(id) ?? {
            source: 0,
            target: 0,
            topShared: false,
        };
        result.set(id, current);

        return current;
    };
    [bottom, top].forEach((map, index) => {
        map.forEach((ends) => {
            const sorted = [...ends].sort(
                (left, right) =>
                    orderKey(counterpart(left)) - orderKey(counterpart(right)),
            );
            sorted.forEach((end, slot) => {
                const current = entry(end.requirement.id);
                current[end.end] = slot * EDGE_SPACING;

                if (index === 1 && sorted.length > 1) {
                    current.topShared = true;
                }
            });
        });
    });

    return result;
};

export const buildRequirementEdges = (
    requirements: CurriculumRequirement[],
    subjects: CurriculumBuilderSubject[],
    subjectById: Map<string, CurriculumBuilderSubject>,
): Edge[] => {
    const cycleOf = new Map(
        subjects.map((subject) => [subject.id, subject.cycle]),
    );
    // Un correquisito del mismo nivel se dibuja por encima de las tarjetas, como en la
    // malla oficial, con punta en los dos extremos; por debajo cruzaba las horas.
    const sameLevelIds = new Set(
        requirements
            .filter(
                (requirement) =>
                    requirement.type === 'correquisito' &&
                    cycleOf.get(requirement.requirement_id) ===
                        cycleOf.get(requirement.subject_id),
            )
            .map((requirement) => requirement.id),
    );
    const offsets = edgeOffsets(requirements, subjectById, sameLevelIds);

    return requirements.map((requirement) => {
        const color =
            requirement.type === 'correquisito'
                ? 'var(--curriculum-corequisite)'
                : 'var(--curriculum-prerequisite)';
        const sameLevel = sameLevelIds.has(requirement.id);
        const offset = offsets.get(requirement.id);

        return {
            id: requirement.id,
            source: requirement.requirement_id,
            target: requirement.subject_id,
            type: 'requirement',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color,
                width: 16,
                height: 16,
            },
            ...(sameLevel
                ? {
                      markerStart: {
                          type: MarkerType.ArrowClosed,
                          color,
                          width: 16,
                          height: 16,
                      },
                  }
                : {}),
            style: { stroke: color, strokeWidth: 2 },
            data: {
                label:
                    requirement.type === 'correquisito'
                        ? 'Correquisito'
                        : 'Prerrequisito',
                sourceOffset: offset?.source ?? 0,
                targetOffset: offset?.target ?? 0,
                sameLevel,
                // Con varias líneas en el borde superior, cada una conserva su reparto:
                // si una se recentrara, caería sobre la vecina.
                targetShared: offset?.topShared ?? false,
            },
        };
    });
};
