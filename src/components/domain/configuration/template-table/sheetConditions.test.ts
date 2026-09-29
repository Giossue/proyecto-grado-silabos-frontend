import { getSchema } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { followUpCandidates } from '@/components/domain/configuration/template-table/sheetConditions';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';

const schema = getSchema(templateTableExtensions());
const field = (key: string, label: string, extra: Record<string, unknown> = {}) => ({ type: 'field', attrs: { key, label, kind: 'texto_largo', ...extra } });
const cell = (content: unknown[], rowspan = 1) => ({ type: 'tableCell', attrs: { rowspan }, content: [{ type: 'paragraph', content }] });
const text = (value: string) => ({ type: 'text', text: value });
const keys = (doc: ProseMirrorNode, trigger: string) => followUpCandidates(doc, trigger).map((item) => item.key);

const card = (formationShowWhen: unknown = null) => ProseMirrorNode.fromJSON(schema, { type: 'doc', content: [{ type: 'table', content: [
    { type: 'tableRow', content: [cell([text('Asignatura')]), cell([text('Redes')])] },
    { type: 'tableRow', content: [cell([text('ESTUDIANTES CON DISCAPACIDAD')], 3), cell([text('Sí '), field('discapacidad', 'Estudiantes con discapacidad', { kind: 'seleccion_unica', choice: 'Sí' })]), cell([text('Tipo: '), field('tipo', 'Tipo de discapacidad')])] },
    { type: 'tableRow', content: [cell([text('Adaptación: '), field('adaptacion', 'Adaptación curricular')])] },
    { type: 'tableRow', content: [cell([text('No '), field('discapacidad', 'Estudiantes con discapacidad', { kind: 'seleccion_unica', choice: 'No' })])] },
    { type: 'tableRow', content: [cell([text('Formación: '), field('formacion', 'Formación y experiencia', { showWhen: formationShowWhen })])] },
] }] });

describe('preguntas de seguimiento que ofrece la hoja (I-159)', () => {
    it('en una tabla ofrece solo las preguntas del bloque de filas de la pregunta que se responde', () => {
        expect(keys(card(), 'discapacidad')).toEqual(['tipo', 'adaptacion']);
    });

    it('sigue ofreciendo una pregunta ya atada fuera del bloque, para poder quitarla', () => {
        expect(keys(card({ key: 'discapacidad', value: 'Sí' }), 'discapacidad')).toEqual(['tipo', 'adaptacion', 'formacion']);
    });

    it('fuera de tablas ofrece todas las preguntas del docente de la parte', () => {
        const doc = ProseMirrorNode.fromJSON(schema, { type: 'doc', content: [
            { type: 'paragraph', content: [field('evalua', 'Evalúa en línea', { kind: 'seleccion_unica', options: ['Sí', 'No'] })] },
            { type: 'paragraph', content: [field('plataforma', 'Plataforma')] },
            { type: 'paragraph', content: [field('criterios', 'Criterios')] },
        ] });

        expect(keys(doc, 'evalua')).toEqual(['plataforma', 'criterios']);
    });
});
