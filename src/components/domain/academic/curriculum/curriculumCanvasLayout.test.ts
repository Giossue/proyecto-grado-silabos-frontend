import { describe, expect, it } from 'vitest';
import type { CurriculumBuilderSubject } from '@/types/academic';
import { buildRequirementEdges, subjectStep } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

const subject = (id: string, cycle: number, position: number): CurriculumBuilderSubject =>
    ({ id, code: id, name: id, cycle, position, organization_unit: null, organization_unit_label: null }) as unknown as CurriculumBuilderSubject;

const edgesFor = (subjects: CurriculumBuilderSubject[], pairs: Array<[string, string]>) => {
    const byId = new Map(subjects.map((item) => [item.id, item]));
    const requirements = pairs.map(([from, to], index) => ({ id: `r${index}`, subject_id: to, requirement_id: from, type: 'prerrequisito' as const }));

    return buildRequirementEdges(requirements, subjects, byId);
};

describe('trazado de relaciones de la malla', () => {
    it('separa en abscisa la bajada y la subida que caen en la misma columna del mismo hueco', () => {
        // A (col 0) → B (col 1 abajo); C (col 1 arriba) → D (col 2 abajo). Columna 1 recibe
        // una línea desde la izquierda y emite otra hacia la derecha: no deben compartir x.
        const edges = edgesFor(
            [subject('A', 1, 0), subject('C', 1, 1), subject('B', 2, 1), subject('D', 2, 2)],
            [['A', 'B'], ['C', 'D']],
        );
        const [toB, fromC] = edges.map((edge) => edge.data!);

        expect(toB.targetOffset).toBeLessThan(fromC.sourceOffset);
        expect(toB.channelIndex).not.toBe(fromC.channelIndex);
        expect(toB.channelCount).toBe(2);
    });

    it('elige el orden de carriles que evita cruces cuando existe uno', () => {
        // A (col 0) → B (col 2): va a la derecha. C (col 1) → D (col 1): baja recto.
        // Si la horizontal de A→B pasara por debajo de la bajada de C, se cruzarían.
        const edges = edgesFor(
            [subject('A', 1, 0), subject('C', 1, 1), subject('D', 2, 1), subject('B', 2, 2)],
            [['A', 'B'], ['C', 'D']],
        );
        const [aToB, cToD] = edges.map((edge) => edge.data!);

        expect(cToD.sourceOffset).toBe(cToD.targetOffset);
        expect(aToB.channelIndex).toBeLessThan(cToD.channelIndex);
        expect(subjectStep).toBeGreaterThan(0);
    });
});
