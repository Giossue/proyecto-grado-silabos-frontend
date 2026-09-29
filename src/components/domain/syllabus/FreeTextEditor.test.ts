import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { renderFreeText } from '@/components/domain/syllabus/freeTextRender';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import { TooltipProvider } from '@/components/ui/tooltip';

const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

// Sin TooltipProvider externo: el formulario del docente no tiene uno y los botones deben verse igual.
const mountEditor = (modelValue: DocumentNode | null = null) => {
    const wrapper = mount({
        components: { FreeTextEditor },
        data: () => ({ value: modelValue, emitted: [] as DocumentNode[] }),
        template: '<FreeTextEditor id="libre" label="Metodología" :model-value="value" @update:model-value="emitted.push($event)" />',
    }, { attachTo: document.body });
    wrappers.push(wrapper);

    return wrapper;
};
const button = (label: string) => document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

describe('Texto libre del docente', () => {
    it('ofrece negrita, cursiva, listas y tabla, y al insertar la tabla muestra sus acciones', async () => {
        const wrapper = mountEditor();
        await flushPromises();
        expect(['Negrita', 'Cursiva', 'Lista con viñetas', 'Lista numerada', 'Insertar tabla'].every((label) => button(label))).toBe(true);

        button('Insertar tabla').click();
        await flushPromises();

        const last = (wrapper.vm as unknown as { emitted: DocumentNode[] }).emitted.at(-1)!;
        expect(last.content?.some((node) => node.type === 'table')).toBe(true);
        expect(button('Agregar fila')).not.toBeNull();
        expect(button('Quitar tabla')).not.toBeNull();
    });

    it('en lectura dibuja párrafos, listas y tablas sin estilos extra', () => {
        const doc: DocumentNode = { type: 'doc', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Enfoque', marks: [{ type: 'bold' }] }] },
            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Proyecto' }] }] }] },
            { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Unidad' }] }] }] }] },
        ] };
        const wrapper = mount({ render: () => renderFreeText(doc) });
        wrappers.push(wrapper);

        expect(wrapper.find('strong').text()).toBe('Enfoque');
        expect(wrapper.find('li').text()).toBe('Proyecto');
        expect(wrapper.find('th').text()).toBe('Unidad');
    });

    it('la hoja del sílabo usa el editor cuando el docente puede escribir y la lectura si no', async () => {
        const field: DocumentField = { key: 'metodologia', label: 'Metodología', type: 'texto_libre', teacher_editable: true, value: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Aula invertida' }] }] } };
        const document: DocumentNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'metodologia', label: 'Metodología', kind: 'texto_libre' } }] }] };
        const editable = mount({
            components: { TemplateDocumentView, TooltipProvider },
            setup: () => ({ document, fields: [field] }),
            template: '<TooltipProvider><TemplateDocumentView :document="document" :fields="fields" :variables="{}" editable presentation="form" /></TooltipProvider>',
        });
        wrappers.push(editable);
        await flushPromises();
        expect(editable.findComponent(FreeTextEditor).exists()).toBe(true);

        const readonly = mount(TemplateDocumentView, { props: { document, fields: [field], variables: {} } });
        wrappers.push(readonly);
        expect(readonly.findComponent(FreeTextEditor).exists()).toBe(false);
        expect(readonly.text()).toContain('Aula invertida');
    });
});
