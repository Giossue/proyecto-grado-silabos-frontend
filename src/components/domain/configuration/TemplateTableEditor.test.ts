import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import TemplateTableEditor from '@/components/domain/configuration/TemplateTableEditor.vue';
import { createDocumentPaginator } from '@/lib/documentPagination';

const cell = (text: string) => ({
    type: 'tableCell',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('TemplateTableEditor', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('deja que la hoja parta la tabla por filas en lugar de moverla entera', async () => {
        const root = document.createElement('div');
        const unit = document.createElement('div');
        unit.setAttribute('data-page-unit', '');
        root.append(unit);
        document.body.append(root);
        const wrapper = mount(TemplateTableEditor, {
            attachTo: unit,
            global: {
                stubs: {
                    teleport: true,
                    TemplateToolbarButton: true,
                    TemplateToolbarSelect: true,
                    TemplateTableInsertMenu: true,
                    TemplateTableRowsMenu: true,
                    TemplateTableNewFieldDialog: true,
                    TemplateTableNewDataSheet: true,
                    TemplateTableProjectDataDialog: true,
                },
            },
            props: {
                document: {
                    type: 'doc',
                    content: [{
                        type: 'table',
                        content: ['A', 'B', 'C'].map((text) => ({
                            type: 'tableRow',
                            content: [cell(text)],
                        })),
                    }],
                } as never,
                pending: false,
                fontFamily: 'Arial',
                fontSize: 11,
                textColor: '#000',
                bodyAlignment: 'left',
                colors: [],
                fields: [],
                variables: [],
                templateId: 'plantilla-1',
                sectionTitle: 'Resultados de aprendizaje',
            },
        });
        await flushPromises();
        await nextTick();

        // Filas de 60 px en hojas de 100 px: la segunda cruza el borde.
        const rows = () =>
            Array.from(root.querySelectorAll<HTMLTableRowElement>('tr')).filter(
                (row) => !row.hasAttribute('data-page-spacer'),
            );
        rows().forEach((row, index) => {
            row.getBoundingClientRect = () =>
                ({ top: index * 60, bottom: 60 + index * 60, left: 0, right: 100 }) as DOMRect;
        });
        root.getBoundingClientRect = () => ({ top: 0, left: 0 }) as DOMRect;

        createDocumentPaginator(root, () => ({ width: 800, height: 100, margin: 0, gap: 0 })).paginate();

        const spacers = root.querySelectorAll<HTMLElement>('tr[data-page-spacer]');
        expect(spacers).toHaveLength(1);
        expect(spacers[0].nextElementSibling?.textContent).toBe('B');
        expect(root.querySelector('[data-page-unit] > [data-page-spacer]')).toBeNull();
        wrapper.unmount();
    });
});
