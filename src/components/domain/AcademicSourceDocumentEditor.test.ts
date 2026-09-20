import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import type { SourceDocument } from '@/api/sources';
import AcademicSourceDocumentEditor from '@/components/domain/AcademicSourceDocumentEditor.vue';

describe('AcademicSourceDocumentEditor', () => {
    it('entrega todos los bloques al paginador y conserva el texto de las tablas', async () => {
        const document: SourceDocument = {
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
                            content: [{ type: 'text', text: 'Unidad Básica' }],
                        }],
                    }],
                }],
            }],
        };
        const wrapper = mount(AcademicSourceDocumentEditor, {
            props: { modelValue: document, label: 'Contenido de prueba' },
            attachTo: documentElement(),
        });

        await flushPromises();
        await nextTick();

        const editor = wrapper.get('.tiptap');
        expect(editor.attributes('data-page-markdown-flow-through')).toBe('');
        expect(editor.get('table').text()).toContain('Unidad Básica');

        wrapper.unmount();
    });
});

const documentElement = (): HTMLDivElement => {
    const element = window.document.createElement('div');
    window.document.body.append(element);

    return element;
};
