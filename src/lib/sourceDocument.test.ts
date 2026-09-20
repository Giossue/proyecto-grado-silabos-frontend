import { describe, expect, it } from 'vitest';
import type { SourceDocument } from '@/api/sources';
import { sanitizeSourceDocument } from '@/lib/sourceDocument';

describe('sanitizeSourceDocument', () => {
    it('preserva la celda vacía y retira el nodo de texto incompatible', () => {
        const input: SourceDocument = {
            schemaVersion: 1,
            type: 'doc',
            content: [{
                type: 'table',
                content: [{
                    type: 'tableRow',
                    content: [{
                        type: 'tableCell',
                        content: [{
                            type: 'paragraph',
                            content: [{ type: 'text', text: '' }],
                        }],
                    }],
                }],
            }],
        };

        const result = sanitizeSourceDocument(input);

        expect(result.repaired).toBe(true);
        expect(result.document.content[0].content?.[0].content?.[0].content).toEqual([
            { type: 'paragraph' },
        ]);
    });

    it('no modifica un documento válido', () => {
        const input: SourceDocument = {
            schemaVersion: 1,
            type: 'doc',
            content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Contenido académico' }],
            }],
        };

        expect(sanitizeSourceDocument(input)).toEqual({
            document: input,
            repaired: false,
        });
    });

    it('recupera el nivel de un encabezado sin mostrar los marcadores Markdown', () => {
        const input: SourceDocument = {
            schemaVersion: 1,
            type: 'doc',
            content: [{
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: '#### 2.1. Carrera de Software' }],
            }],
        };

        expect(sanitizeSourceDocument(input)).toEqual({
            repaired: true,
            document: {
                schemaVersion: 1,
                type: 'doc',
                content: [{
                    type: 'heading',
                    attrs: { level: 4 },
                    content: [{ type: 'text', text: '2.1. Carrera de Software' }],
                }],
            },
        });
    });

    it('convierte saltos escapados en nodos hardBreak', () => {
        const input: SourceDocument = {
            schemaVersion: 1,
            type: 'doc',
            content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: 'Liderazgo\\nAutocontrol\\nDecisiones' }],
            }],
        };

        const result = sanitizeSourceDocument(input);

        expect(result.repaired).toBe(true);
        expect(result.document.content[0].content).toEqual([
            { type: 'text', text: 'Liderazgo' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Autocontrol' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Decisiones' },
        ]);
    });

    it('retira etiquetas HTML usadas como descripción de imagen', () => {
        const input: SourceDocument = {
            schemaVersion: 1,
            type: 'doc',
            content: [{
                type: 'sourceImage',
                attrs: {
                    objectId: '0199d329-c0ee-7000-8000-000000000001',
                    alt: '<div><img src="images/sello.jpg" alt="Image" /></div>',
                },
            }],
        };

        expect(sanitizeSourceDocument(input).document.content[0].attrs?.alt).toBe('Imagen');
    });
});
