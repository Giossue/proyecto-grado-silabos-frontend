import { describe, expect, it } from 'vitest';
import { fieldTypeEntry, fieldTypeKeys, fieldTypeRegistry, sectionFields } from '@/components/domain/fieldTypes/registry';

/**
 * Claves de config/field_types.php del backend (FieldTypeRegistry::keys()). Si el backend suma un tipo,
 * esta lista y el registro del frontend deben actualizarse juntos; la prueba de paridad del backend
 * (tests/Unit/Configuration/FieldTypesTest.php) falla primero y avisa.
 */
const BACKEND_FIELD_TYPES = ['texto', 'ficha', 'tabla', 'automatico', 'fijo'];

describe('Registro de tipos de campo', () => {
    it('tiene una entrada completa por cada tipo registrado en el backend', () => {
        expect([...fieldTypeKeys].sort()).toEqual([...BACKEND_FIELD_TYPES].sort());
        for (const key of BACKEND_FIELD_TYPES) {
            const entry = fieldTypeEntry(key);
            expect(entry, `Falta el tipo «${key}» en el registro del frontend`).not.toBeNull();
            expect(entry!.label).not.toBe('');
            expect(entry!.icon).toBeTruthy();
            expect(entry!.EditorComponent).toBeTruthy();
            expect(entry!.ViewComponent).toBeTruthy();
            expect(entry!.defaultConfig).toBeTypeOf('object');
        }
    });

    it('no conoce tipos antiguos y decide qué escribe el docente', () => {
        expect(fieldTypeEntry('texto_largo')).toBeNull();
        expect(fieldTypeEntry('constructor')).toBeNull();
        expect(fieldTypeRegistry.texto.teacherEditable({})).toBe(true);
        expect(fieldTypeRegistry.ficha.teacherEditable({ adjustable: true })).toBe(true);
        expect(fieldTypeRegistry.ficha.teacherEditable({ adjustable: false })).toBe(false);
        expect(fieldTypeRegistry.tabla.teacherEditable({})).toBe(true);
        expect(fieldTypeRegistry.automatico.teacherEditable({})).toBe(false);
        expect(fieldTypeRegistry.fijo.teacherEditable({})).toBe(false);
    });

    it('calcula cuándo un valor está vacío por tipo', () => {
        const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] };
        expect(fieldTypeRegistry.texto.isEmpty(null, {})).toBe(true);
        expect(fieldTypeRegistry.texto.isEmpty({ type: 'doc', content: [{ type: 'paragraph' }] }, {})).toBe(true);
        expect(fieldTypeRegistry.texto.isEmpty(doc, {})).toBe(false);
        expect(fieldTypeRegistry.tabla.isEmpty({ a: { b: ' ' } }, {})).toBe(true);
        expect(fieldTypeRegistry.tabla.isEmpty({ a: { b: 'Dato' } }, {})).toBe(false);
        expect(fieldTypeRegistry.automatico.isEmpty(null, {})).toBe(false);
    });

    it('toma los campos de la sección v7 y, en fotografías anteriores, de sus bloques', () => {
        expect(sectionFields({ fields: [1, 2] })).toEqual([1, 2]);
        expect(sectionFields({ blocks: [{ fields: [1] }, { fields: [2] }] })).toEqual([1, 2]);
    });
});
