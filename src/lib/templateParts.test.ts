import { describe, expect, it } from 'vitest';
import { inlineNodeLabel } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import { partTypeLabel, sectionOrientation } from '@/lib/templateParts';
import type { TemplateFieldContainer } from '@/types/configuration';

const part = (overrides: Partial<TemplateFieldContainer>): TemplateFieldContainer => ({
    id: 'block', key: 'block', title: 'Parte', type: 'narrativa', content_type: 'text',
    table: null, document: null, fields: [], ...overrides,
});

describe('templateParts', () => {
    it('nombra el tipo real de la parte', () => {
        expect(partTypeLabel(part({ content_type: 'fixed' }))).toBe('Texto fijo');
        expect(partTypeLabel(part({ content_type: 'table', fields: [{} as never] }))).toBe('Tabla');
    });

    it('usa hoja horizontal cuando una parte de la sección la pide', () => {
        expect(sectionOrientation([part({}), part({ page_orientation: 'landscape' })], 'portrait')).toBe('landscape');
        expect(sectionOrientation([part({})], 'portrait')).toBe('portrait');
    });

    it('muestra los datos por su nombre, nunca por su clave', () => {
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' }, () => 'Nombre de la carrera')).toBe('Nombre de la carrera');
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' })).toBe('');
        expect(inlineNodeLabel('column', { key: 'horas_acd', label: 'Horas ACD' })).toBe('!Horas ACD');
        expect(inlineNodeLabel('field', { key: 'formacion', label: 'Formación' })).toBe('!Formación');
        expect(inlineNodeLabel('variable', { id: 'curricular_resultados', label: 'curricular_resultados' }, () => 'Resultados')).toBe('@Resultados');
    });
});
