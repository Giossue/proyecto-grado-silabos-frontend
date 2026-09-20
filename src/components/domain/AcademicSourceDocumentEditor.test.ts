import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import type { SourceDocument } from '@/api/sources';
import AcademicSourceDocumentEditor from '@/components/domain/AcademicSourceDocumentEditor.vue';

describe('AcademicSourceDocumentEditor', () => {
    it('muestra el contenido en un editor continuo sin simular una hoja', async () => {
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
        expect(editor.attributes('data-source-document-flow')).toBe('continuous');
        expect(wrapper.findComponent({ name: 'PaginatedDocument' }).exists()).toBe(false);
        expect(wrapper.find('.source-document-canvas').exists()).toBe(false);
        expect(wrapper.find('.source-document-content').exists()).toBe(true);
        expect(editor.get('table').text()).toContain('Unidad Básica');

        wrapper.unmount();
    });
});

const documentElement = (): HTMLDivElement => {
    const element = window.document.createElement('div');
    window.document.body.append(element);

    return element;
};
