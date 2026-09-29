import { describe, expect, it } from 'vitest';
import { inlineNodeLabel, inlineNodeName } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import { partFormLabel, sectionOrientation } from '@/lib/templateParts';
import type { TemplateFieldContainer } from '@/types/configuration';

const part = (overrides: Partial<TemplateFieldContainer>): TemplateFieldContainer => ({
    id: 'block', key: 'block', title: 'Parte', type: 'narrativa', content_type: 'text',
    table: null, document: null, fields: [], ...overrides,
});

describe('templateParts', () => {
    it('nombra la forma con la que se creó la parte', () => {
        expect(partFormLabel(part({ content_type: 'text', document: { type: 'doc' }, fields: [{ key: 'libre', label: 'Libre', type: 'texto_libre' } as never] }))).toBe('Texto libre');
        expect(partFormLabel(part({ content_type: 'text', document: { type: 'doc' } }))).toBe('Contenido de la plantilla');
        expect(partFormLabel(part({ content_type: 'text' }))).toBe('Párrafo');
        expect(partFormLabel(part({ content_type: 'bulleted_list' }))).toBe('Lista');
        expect(partFormLabel(part({ content_type: 'table', fields: [{} as never] }))).toBe('Tabla');
    });

    it('usa hoja horizontal cuando una parte de la sección la pide', () => {
        expect(sectionOrientation([part({}), part({ page_orientation: 'landscape' })], 'portrait')).toBe('landscape');
        expect(sectionOrientation([part({})], 'portrait')).toBe('portrait');
    });

    it('muestra los datos por su nombre, nunca por su clave', () => {
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' }, () => 'Nombre de la carrera')).toBe('Nombre de la carrera');
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' })).toBe('');
        // Marcas de la hoja (I-155): se ven por su tipo; el nombre interno queda en la ayuda.
        expect(inlineNodeLabel('column', { key: 'horas_acd', label: 'Horas ACD' })).toBe('Docente');
        expect(inlineNodeLabel('field', { key: 'formacion', label: 'Formación', kind: 'texto_largo' })).toBe('Docente');
        expect(inlineNodeLabel('field', { key: 'discapacidad', label: 'Discapacidad', kind: 'seleccion_unica', options: ['Sí', 'No'] })).toBe('Docente: Sí o No');
        expect(inlineNodeLabel('field', { key: 'discapacidad', label: 'Discapacidad', kind: 'seleccion_unica', options: ['Sí', 'No'], choice: 'Sí' })).toBe('X si Discapacidad = Sí');
        expect(inlineNodeLabel('variable', { id: 'curricular_resultados', label: 'curricular_resultados' }, () => 'Resultados')).toBe('Proyecto de carrera');
        expect(inlineNodeName('variable', { id: 'curricular_resultados', label: 'curricular_resultados' }, () => 'Resultados')).toBe('Resultados');
    });
});
