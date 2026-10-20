import { describe, expect, it } from 'vitest';
import conformance from '@/test/fixtures/block-conformance.json';
import definition from '@/test/fixtures/template-definition.json';
import { ruleFailures } from '@/lib/blocks/rules';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import { settle } from '@/lib/blocks/values';
import { filledText, resolveBlock, toDocument } from '@/lib/blocks/walk';

const official = definition as unknown as TemplateDefinitionPayload;
type Case = { kind: string; props: Record<string, unknown>; value: Record<string, unknown>; variables: Record<string, string>; expanded: unknown; filled: string };

describe('intérprete de bloques', () => {
    it.each((conformance as unknown as Case[]).map((item, index) => [`${index} ${item.kind}`, item] as const))('produce lo mismo que el backend: %s', (_, item) => {
        const block = official.blocks[item.kind]!;
        const resolved = resolveBlock(block, item.props, item.value, item.variables);

        expect(toDocument(resolved)).toEqual(item.expanded);
        expect(filledText(resolved)).toBe(item.filled);
    });

    it('evalúa las reglas de unidades con los mismos mensajes del backend', () => {
        const units = official.blocks.unidades!;
        const value = { units: [{ nombre: '', resultado: '', semanas: [{ acd_h: '3', ape_h: '1,5', aa_h: '' }, { acd_h: '2' }] }, { nombre: '', resultado: '', semanas: [{ aa_h: '4' }] }] };

        expect(ruleFailures(units.rules, value, { horas_docencia: '5', horas_practicas: '2', horas_autonomas: '4' }, 'submit')).toEqual([
            { code: 'semanas_unidades_incompletas', message: 'Las unidades deben repartir las 16 semanas del período: tienen 3.' },
            { code: 'horas_unidades_no_coinciden', message: 'Las horas de las unidades deben sumar las de la asignatura: APE 1.5 de 2.' },
        ]);
    });

    it('borra lo que deja de aplicar como lo hace el backend', () => {
        const identification = official.blocks.identificacion!;
        expect(settle(identification.value, { disability: { answer: 'no', type: 'Visual', description: 'x' } }, {})).toEqual({ disability: { answer: 'no', type: '', description: '' } });
        const question = official.blocks.si_no!;
        expect(settle(question.value, { answer: 'no', rows: [{ autor: 'Ana' }] }, { columns: [{ key: 'autor', label: 'Autor' }] })).toEqual({ answer: 'no', rows: [] });
    });
});
