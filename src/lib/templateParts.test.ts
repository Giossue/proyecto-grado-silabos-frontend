import { describe, expect, it } from 'vitest';
import { inlineNodeLabel, inlineNodeName, markClass, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import { isFreeTextPart, partFormLabel, sectionOrientation } from '@/lib/templateParts';
import type { TemplateFieldContainer } from '@/types/configuration';

const part = (overrides: Partial<TemplateFieldContainer>): TemplateFieldContainer => ({
    id: 'block', key: 'block', title: 'Campo', type: 'narrativa', content_type: 'text',
    document: null, fields: [], ...overrides,
});

describe('templateParts', () => {
    it('nombra la forma con la que se creó el campo', () => {
        expect(partFormLabel(part({ content_type: 'text', document: { type: 'doc' }, fields: [{ key: 'libre', label: 'Libre', type: 'texto_libre' } as never] }))).toBe('Texto libre');
        expect(partFormLabel(part({ content_type: 'text', document: { type: 'doc' } }))).toBe('Personalizado');
        expect(partFormLabel(part({ content_type: 'text' }))).toBe('Párrafo');
        expect(partFormLabel(part({ content_type: 'bulleted_list' }))).toBe('Lista');
        expect(partFormLabel(part({ content_type: 'table', fields: [{} as never] }))).toBe('Tabla');
    });

    it('usa hoja horizontal cuando un campo de la sección la pide', () => {
        expect(sectionOrientation([part({}), part({ page_orientation: 'landscape' })], 'portrait')).toBe('landscape');
        expect(sectionOrientation([part({})], 'portrait')).toBe('portrait');
    });

    it('un campo de Texto libre se reconoce por su pregunta texto_libre', () => {
        expect(isFreeTextPart(part({ fields: [{ id: 'f', key: 'objetivo', label: 'Objetivo', type: 'texto_libre' }] } as never))).toBe(true);
        expect(isFreeTextPart(part({}))).toBe(false);
    });

    it('muestra los datos por su nombre, nunca por su clave', () => {
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' }, () => 'Nombre de la carrera')).toBe('Nombre de la carrera');
        expect(inlineNodeLabel('variable', { id: 'carrera', label: 'carrera' })).toBe('');
        expect(inlineNodeLabel('column', { key: 'horas_acd', label: 'Horas ACD' })).toBe('Docente');
        expect(inlineNodeLabel('field', { key: 'formacion', label: 'Formación', kind: 'texto_largo' })).toBe('Docente');
        expect(inlineNodeLabel('field', { key: 'discapacidad', label: 'Discapacidad', kind: 'seleccion_unica', options: ['Sí', 'No'] })).toBe('Docente: Sí o No');
        expect(inlineNodeLabel('field', { key: 'discapacidad', label: 'Discapacidad', kind: 'seleccion_unica', options: ['Sí', 'No'], choice: 'Sí' })).toBe('X');
        expect(inlineNodeName('variable', { id: 'carrera', label: 'carrera' }, () => 'Nombre de la carrera')).toBe('Nombre de la carrera');
    });

    it('distingue las firmas de los datos automáticos en la hoja', () => {
        const signature = { id: 'firma_bibliotecario', label: 'firma_bibliotecario' };
        expect(sheetMark('variable', signature)).toBe('signature');
        expect(markClass[sheetMark('variable', signature)]).toBe('template-table-signature');
        expect(inlineNodeLabel('variable', signature, () => 'Firma de biblioteca')).toBe('Firma de biblioteca');
        expect(inlineNodeLabel('variable', signature)).toBe('Firma');
        expect(sheetMark('variable', { id: 'nombre_carrera' })).toBe('automatic');
    });
});
