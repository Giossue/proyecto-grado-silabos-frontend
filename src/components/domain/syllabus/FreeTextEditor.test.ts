import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/core';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { nodesOfType, type DocumentNode } from '@/lib/templateDocument';

const doc = (text: string): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountEditor = (modelValue: DocumentNode | null = null, disabled = false) => {
    const wrapper = mount(FreeTextEditor, {
    props: { id: 'libre', label: 'Contenido', modelValue, disabled, variables: [{ key: 'nombre_asignatura', label: 'Asignatura', sample: 'Calidad' }] },
    attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
};
const editorOf = (wrapper: ReturnType<typeof mountEditor>): Editor => (wrapper.vm as unknown as { editor: Editor }).editor;

describe('Editor de documentos compartido', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('ofrece texto con formato, listas, tablas y variables sin seleccionar tipo', async () => {
        const wrapper = mountEditor();
        await flushPromises();
        expect(wrapper.find('[role="toolbar"]').exists()).toBe(true);
        for (const label of ['Negrita', 'Cursiva', 'Subrayado', 'Lista con viñetas', 'Lista numerada', 'Insertar tabla']) expect(wrapper.find(`[aria-label="${label}"]`).exists()).toBe(true);
        expect(wrapper.get('[role="textbox"]').attributes('aria-label')).toBe('Contenido');
        expect(wrapper.find('[aria-label="Insertar dato del sistema"]').exists()).toBe(true);
    });

    it('añade filas y columnas y guarda los totales como texto sin cálculo', async () => {
        const wrapper = mountEditor();
        await flushPromises();
        const editor = editorOf(wrapper);
        editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
        editor.commands.insertContent('999');
        editor.commands.addRowAfter();
        editor.commands.addColumnAfter();
        await flushPromises();
        const value = wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;
        expect(nodesOfType(value, 'tableRow')).toHaveLength(3);
        expect(nodesOfType(value, 'tableRow')[0]!.content).toHaveLength(3);
        expect(nodesOfType(value, 'text').map((node) => node.text)).toContain('999');
        await vi.waitFor(() => {
            const labels = wrapper.findAll('[role="toolbar"] button').map((button) => button.text());
            expect(labels).toEqual(expect.arrayContaining(['+ Fila', '− Fila', '+ Columna', '− Columna', 'Combinar', 'Separar', 'Encabezado', 'Quitar tabla']));
        });
    });

    it('conserva celdas combinadas, estilos y variables al escribir', async () => {
        const value: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 2, rowspan: 1, colwidth: [100, 200], backgroundColor: '#DBE5F1', textColor: '#0070C0', bold: true }, content: [{ type: 'paragraph', content: [{ type: 'variable', attrs: { id: 'nombre_asignatura' } }] }] }] }] }] };
        const wrapper = mountEditor(value);
        await flushPromises();
        const editor = editorOf(wrapper);
        editor.commands.insertContent({ type: 'paragraph', content: [{ type: 'text', text: 'Más contenido' }] });
        const current = editor.getJSON() as DocumentNode;
        expect(nodesOfType(current, 'tableCell')[0]?.attrs).toMatchObject({ colspan: 2, colwidth: [100, 200], backgroundColor: '#DBE5F1', bold: true });
        expect(nodesOfType(current, 'variable')[0]?.attrs?.id).toBe('nombre_asignatura');
        expect(wrapper.find('[data-variable="nombre_asignatura"]').text()).toBe('Asignatura');
    });

    it('sincroniza cambios externos sin disparar autoguardado', async () => {
        const wrapper = mountEditor(doc('Inicial'));
        await flushPromises();
        await wrapper.setProps({ modelValue: doc('Actualizado') });
        expect(editorOf(wrapper).getText()).toBe('Actualizado');
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('deshabilita documento y controles durante una pausa', async () => {
        const wrapper = mountEditor(doc('Contenido'), true);
        await flushPromises();
        expect(editorOf(wrapper).isEditable).toBe(false);
        for (const button of wrapper.findAll('[role="toolbar"] button')) expect(button.attributes('disabled')).toBeDefined();
        await wrapper.setProps({ disabled: false });
        expect(editorOf(wrapper).isEditable).toBe(true);
    });
});
